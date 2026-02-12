import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../config/theme.dart';
import '../../models/medical_record.dart';
import '../../providers/records_provider.dart';

class RecordsScreen extends ConsumerStatefulWidget {
  const RecordsScreen({super.key});
  @override
  ConsumerState<RecordsScreen> createState() => _RecordsScreenState();
}

class _RecordsScreenState extends ConsumerState<RecordsScreen> {
  String _search = '';
  String? _typeFilter;

  RecordsParams get _params => RecordsParams(search: _search.isEmpty ? null : _search, type: _typeFilter);

  @override
  Widget build(BuildContext context) {
    final records = ref.watch(recordsProvider(_params));

    return Scaffold(
      appBar: AppBar(title: const Text('Records', style: TextStyle(fontWeight: FontWeight.bold))),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: TextField(
              onChanged: (v) => setState(() => _search = v),
              decoration: const InputDecoration(hintText: 'Search records...', prefixIcon: Icon(Icons.search)),
            ),
          ),
          SizedBox(
            height: 56,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              children: [
                _FilterChip(label: 'All', selected: _typeFilter == null, onTap: () => setState(() => _typeFilter = null)),
                for (final type in RecordType.values)
                  Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: _FilterChip(
                      label: type.displayName,
                      selected: _typeFilter == type.name.toUpperCase(),
                      onTap: () => setState(() => _typeFilter = type.name.toUpperCase()),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: records.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: Colors.grey),
                    const SizedBox(height: 16),
                    const Text('Failed to load records'),
                    const SizedBox(height: 8),
                    FilledButton(onPressed: () => ref.invalidate(recordsProvider(_params)), child: const Text('Retry')),
                  ],
                ),
              ),
              data: (data) {
                if (data.records.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [Icon(Icons.folder_open, size: 64, color: Colors.grey), SizedBox(height: 16), Text('No records found')],
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(recordsProvider(_params)),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: data.records.length,
                    itemBuilder: (context, index) => _RecordCard(record: data.records[index]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _FilterChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Chip(
        label: Text(label, style: TextStyle(color: selected ? Theme.of(context).colorScheme.onPrimary : Colors.grey.shade700, fontSize: 13)),
        backgroundColor: selected ? Theme.of(context).colorScheme.primary : Colors.grey.shade100,
        side: BorderSide.none,
        padding: const EdgeInsets.symmetric(horizontal: 4),
      ),
    );
  }
}

class _RecordCard extends StatelessWidget {
  final MedicalRecord record;
  const _RecordCard({required this.record});

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.recordTypeColor(record.type.name.toUpperCase());
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.push('/records/${record.id}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 48, height: 48,
                decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                child: Icon(Icons.description, color: color),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(record.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                          child: Text(record.type.displayName, style: TextStyle(color: color, fontSize: 12)),
                        ),
                        const SizedBox(width: 8),
                        Text(DateFormat.yMMMd().format(record.recordDate), style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                      ],
                    ),
                    if (record.facility != null) ...[
                      const SizedBox(height: 4),
                      Text(record.facility!, style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
                    ],
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: Colors.grey.shade400),
            ],
          ),
        ),
      ),
    );
  }
}
