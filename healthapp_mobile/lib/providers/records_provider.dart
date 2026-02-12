import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/medical_record.dart';
import '../services/records_service.dart';
import 'auth_provider.dart';

final recordsServiceProvider = Provider<RecordsService>((ref) {
  return RecordsService(ref.read(apiClientProvider));
});

final recordsProvider = FutureProvider.family<RecordsResponse, RecordsParams>(
  (ref, params) async {
    final service = ref.read(recordsServiceProvider);
    return service.getRecords(search: params.search, type: params.type, page: params.page, limit: params.limit);
  },
);

final recordDetailProvider = FutureProvider.family<MedicalRecord, String>((ref, id) async {
  final service = ref.read(recordsServiceProvider);
  return service.getRecord(id);
});

class RecordsParams {
  final String? search;
  final String? type;
  final int page;
  final int limit;

  const RecordsParams({this.search, this.type, this.page = 1, this.limit = 20});

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RecordsParams && search == other.search && type == other.type && page == other.page && limit == other.limit;

  @override
  int get hashCode => Object.hash(search, type, page, limit);
}
