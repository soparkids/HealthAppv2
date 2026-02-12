import 'package:flutter_test/flutter_test.dart';
import 'package:healthapp_mobile/config/api_config.dart';

void main() {
  group('ApiConfig', () {
    test('baseUrl ends without trailing slash', () {
      expect(ApiConfig.baseUrl.endsWith('/'), isFalse);
    });

    test('endpoint paths start with slash', () {
      expect(ApiConfig.records, startsWith('/'));
      expect(ApiConfig.followUps, startsWith('/'));
      expect(ApiConfig.profile, startsWith('/'));
    });
  });
}
