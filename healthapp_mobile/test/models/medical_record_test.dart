import 'package:flutter_test/flutter_test.dart';
import 'package:healthapp_mobile/models/medical_record.dart';

void main() {
  group('MedicalRecord', () {
    test('fromJson parses complete record with report', () {
      final json = {
        'id': 'rec-1',
        'userId': 'user-1',
        'title': 'Chest X-Ray',
        'type': 'XRAY',
        'bodyPart': 'Chest',
        'facility': 'City General Hospital',
        'referringPhysician': 'Dr. Chen',
        'recordDate': '2026-02-03T00:00:00.000Z',
        'fileUrl': null,
        'thumbnailUrl': null,
        'fileType': null,
        'fileSize': null,
        'notes': 'Annual checkup',
        'createdAt': '2026-02-03T00:00:00.000Z',
        'updatedAt': '2026-02-03T00:00:00.000Z',
        'report': {
          'id': 'rpt-1',
          'medicalRecordId': 'rec-1',
          'content': 'Normal chest radiograph.',
          'summary': 'Normal findings.',
          'keyFindings': 'Clear lungs',
          'createdAt': '2026-02-03T00:00:00.000Z',
        },
      };
      final record = MedicalRecord.fromJson(json);
      expect(record.id, 'rec-1');
      expect(record.title, 'Chest X-Ray');
      expect(record.type, RecordType.xray);
      expect(record.bodyPart, 'Chest');
      expect(record.report, isNotNull);
      expect(record.report!.summary, 'Normal findings.');
    });

    test('fromJson handles null optional fields', () {
      final json = {
        'id': 'rec-2',
        'userId': 'user-1',
        'title': 'Test',
        'type': 'OTHER',
        'bodyPart': null,
        'facility': null,
        'referringPhysician': null,
        'recordDate': '2026-01-01T00:00:00.000Z',
        'fileUrl': null,
        'thumbnailUrl': null,
        'fileType': null,
        'fileSize': null,
        'notes': null,
        'createdAt': '2026-01-01T00:00:00.000Z',
        'updatedAt': '2026-01-01T00:00:00.000Z',
        'report': null,
      };
      final record = MedicalRecord.fromJson(json);
      expect(record.bodyPart, isNull);
      expect(record.report, isNull);
    });
  });
}
