import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../config/theme.dart';
import '../../providers/records_provider.dart';

class RecordDetailScreen extends ConsumerWidget {
  final String recordId;
  const RecordDetailScreen({super.key, required this.recordId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final record = ref.watch(recordDetailProvider(recordId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Record Details')),
      body: record.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.grey),
              const SizedBox(height: 16),
              const Text('Failed to load record'),
              const SizedBox(height: 8),
              FilledButton(onPressed: () => ref.invalidate(recordDetailProvider(recordId)), child: const Text('Retry')),
            ],
          ),
        ),
        data: (data) {
          final color = AppTheme.recordTypeColor(data.type.name.toUpperCase());
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                children: [
                  Container(
                    width: 56, height: 56,
                    decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                    child: Icon(Icons.description, color: color, size: 28),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(data.title, style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                          child: Text(data.type.displayName, style: TextStyle(color: color, fontSize: 13)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              _InfoRow(icon: Icons.calendar_today, label: 'Date', value: DateFormat.yMMMMd().format(data.recordDate)),
              if (data.bodyPart != null) _InfoRow(icon: Icons.accessibility, label: 'Body Part', value: data.bodyPart!),
              if (data.facility != null) _InfoRow(icon: Icons.local_hospital, label: 'Facility', value: data.facility!),
              if (data.referringPhysician != null) _InfoRow(icon: Icons.person, label: 'Physician', value: data.referringPhysician!),
              if (data.notes != null) ...[
                const SizedBox(height: 16),
                Text('Notes', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Card(child: Padding(padding: const EdgeInsets.all(16), child: Text(data.notes!))),
              ],
              if (data.report != null) ...[
                const SizedBox(height: 24),
                Text('Report', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (data.report!.summary != null) ...[
                          Text('Summary', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.grey.shade700)),
                          const SizedBox(height: 4),
                          Text(data.report!.summary!),
                          const SizedBox(height: 16),
                        ],
                        if (data.report!.keyFindings != null) ...[
                          Text('Key Findings', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.grey.shade700)),
                          const SizedBox(height: 4),
                          Text(data.report!.keyFindings!),
                          const SizedBox(height: 16),
                        ],
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: () => context.push('/records/$recordId/report/${data.report!.id}'),
                            icon: const Icon(Icons.article),
                            label: const Text('View Full Report'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey.shade600),
          const SizedBox(width: 12),
          Text('$label: ', style: TextStyle(color: Colors.grey.shade600, fontWeight: FontWeight.w500)),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
