class ApiConfig {
  static const String baseUrl = 'http://10.0.2.2:3000'; // Android emulator
  // static const String baseUrl = 'http://localhost:3000'; // iOS simulator

  static const String records = '/api/records';
  static const String followUps = '/api/follow-ups';
  static const String profile = '/api/users/profile';
  static String recordDetail(String id) => '/api/records/$id';
  static String reportTerms(String id) => '/api/reports/$id/terms';
}
