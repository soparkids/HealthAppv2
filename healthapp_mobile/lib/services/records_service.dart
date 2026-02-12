import '../config/api_config.dart';
import '../models/follow_up.dart';
import '../models/medical_record.dart';
import '../models/report.dart';
import 'api_client.dart';

class RecordsResponse {
  final List<MedicalRecord> records;
  final int total;
  final int totalPages;

  const RecordsResponse({required this.records, required this.total, required this.totalPages});
}

class ReportWithTerms {
  final Report report;
  final List<HighlightedTerm> terms;

  const ReportWithTerms({required this.report, required this.terms});
}

class RecordsService {
  final ApiClient _apiClient;

  RecordsService(this._apiClient);

  Future<RecordsResponse> getRecords({String? search, String? type, int page = 1, int limit = 20}) async {
    final params = <String, String>{'page': page.toString(), 'limit': limit.toString()};
    if (search != null && search.isNotEmpty) params['search'] = search;
    if (type != null && type.isNotEmpty) params['type'] = type;

    final data = await _apiClient.get(ApiConfig.records, queryParams: params) as Map<String, dynamic>;
    final records = (data['records'] as List).map((r) => MedicalRecord.fromJson(r as Map<String, dynamic>)).toList();
    final pagination = data['pagination'] as Map<String, dynamic>;

    return RecordsResponse(records: records, total: pagination['total'] as int, totalPages: pagination['totalPages'] as int);
  }

  Future<MedicalRecord> getRecord(String id) async {
    final data = await _apiClient.get(ApiConfig.recordDetail(id)) as Map<String, dynamic>;
    return MedicalRecord.fromJson(data);
  }

  Future<List<FollowUp>> getFollowUps() async {
    final data = await _apiClient.get(ApiConfig.followUps) as List;
    return data.map((f) => FollowUp.fromJson(f as Map<String, dynamic>)).toList();
  }

  Future<ReportWithTerms> getReportWithTerms(String reportId) async {
    final data = await _apiClient.get(ApiConfig.reportTerms(reportId)) as Map<String, dynamic>;
    final report = Report.fromJson(data);
    final terms = (data['highlightedTerms'] as List).map((t) => HighlightedTerm.fromJson(t as Map<String, dynamic>)).toList();
    return ReportWithTerms(report: report, terms: terms);
  }
}
