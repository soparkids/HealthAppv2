import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/records_service.dart';
import 'records_provider.dart';

final reportTermsProvider = FutureProvider.family<ReportWithTerms, String>((ref, reportId) async {
  final service = ref.read(recordsServiceProvider);
  return service.getReportWithTerms(reportId);
});
