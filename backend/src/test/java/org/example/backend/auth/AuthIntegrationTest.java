package org.example.backend.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.backend.auth.dto.LoginRequest;
import org.example.backend.auth.dto.RegisterRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests cho Auth module (Phase 2).
 * Dùng H2 in-memory DB, không cần MySQL.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Đăng ký thành công → 201, trả accessToken và user info")
    void testRegisterSuccess() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("newuser@test.com")
                .password("Password@123")
                .fullName("Nguyễn Văn Test")
                .phone("0901234567")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.user.email").value("newuser@test.com"))
                .andExpect(jsonPath("$.data.user.role").value("ROLE_CUSTOMER"));
    }

    @Test
    @DisplayName("Đăng ký email trùng → 409 Conflict")
    void testRegisterDuplicateEmail() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("duplicate@test.com")
                .password("Password@123")
                .fullName("User 1")
                .phone("0901111111")
                .build();

        // Đăng ký lần đầu
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        // Đăng ký lần 2 cùng email
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email đã được sử dụng"));
    }

    @Test
    @DisplayName("Đăng ký thiếu email → 400 Bad Request")
    void testRegisterMissingEmail() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .password("Password@123")
                .fullName("No Email User")
                .phone("0901234567")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Đăng nhập thành công → 200, trả accessToken")
    void testLoginSuccess() throws Exception {
        // Đăng ký trước
        RegisterRequest registerReq = RegisterRequest.builder()
                .email("logintest@test.com")
                .password("Password@123")
                .fullName("Login User")
                .phone("0909876543")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated());

        // Đăng nhập
        LoginRequest loginReq = LoginRequest.builder()
                .email("logintest@test.com")
                .password("Password@123")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.user.email").value("logintest@test.com"));
    }

    @Test
    @DisplayName("Đăng nhập sai mật khẩu → 401")
    void testLoginWrongPassword() throws Exception {
        // Đăng ký trước
        RegisterRequest registerReq = RegisterRequest.builder()
                .email("wrongpw@test.com")
                .password("CorrectPassword123")
                .fullName("Wrong PW User")
                .phone("0901112233")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated());

        // Đăng nhập sai mật khẩu
        LoginRequest loginReq = LoginRequest.builder()
                .email("wrongpw@test.com")
                .password("WrongPassword999")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /auth/me với Bearer token → 200 trả user info")
    void testGetCurrentUserWithToken() throws Exception {
        // Đăng ký
        RegisterRequest registerReq = RegisterRequest.builder()
                .email("metest@test.com")
                .password("Password@123")
                .fullName("Me Test User")
                .phone("0905556677")
                .build();

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated())
                .andReturn();

        // Lấy access token từ response
        String responseBody = registerResult.getResponse().getContentAsString();
        String accessToken = objectMapper.readTree(responseBody)
                .path("data").path("accessToken").asText();

        // Gọi /auth/me với Bearer token
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("metest@test.com"))
                .andExpect(jsonPath("$.data.fullName").value("Me Test User"))
                .andExpect(jsonPath("$.data.role").value("ROLE_CUSTOMER"));
    }

    @Test
    @DisplayName("GET /auth/me không có token → 401 Unauthorized")
    void testGetCurrentUserWithoutToken() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/v1/health là public → 200")
    void testHealthEndpointIsPublic() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }
}
