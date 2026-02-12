import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/user.dart';
import 'api_client.dart';

class AuthService {
  final ApiClient _apiClient;

  AuthService(this._apiClient);

  Future<String> login(String email, String password) async {
    final csrfUri = Uri.parse('${ApiConfig.baseUrl}/api/auth/csrf');
    final csrfResponse = await http.get(csrfUri);
    final csrfToken = jsonDecode(csrfResponse.body)['csrfToken'] as String;

    final loginUri = Uri.parse('${ApiConfig.baseUrl}/api/auth/callback/credentials');
    final response = await http.post(
      loginUri,
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: {
        'email': email,
        'password': password,
        'csrfToken': csrfToken,
        'json': 'true',
      },
    );

    if (response.statusCode == 200 || response.statusCode == 302) {
      final cookies = response.headers['set-cookie'];
      if (cookies != null) {
        final match = RegExp(r'next-auth\.session-token=([^;]+)').firstMatch(cookies);
        if (match != null) {
          final token = match.group(1)!;
          await _apiClient.saveToken(token);
          return token;
        }
      }
    }

    throw const ApiException(401, 'Invalid email or password');
  }

  Future<User> getProfile() async {
    final data = await _apiClient.get(ApiConfig.profile);
    return User.fromJson(data as Map<String, dynamic>);
  }

  Future<void> logout() async {
    await _apiClient.clearToken();
  }
}
