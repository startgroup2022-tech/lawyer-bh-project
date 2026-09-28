import 'dart:typed_data';

enum ReportKind {
  comprehensive,
  finance,
  invoices,
  leases,
  occupancy,
  clients,
  virtualAddresses,
  maintenance,
  meetingRooms,
}

enum ReportFileFormat { pdf, xlsx }

enum ReportPeriodPreset { today, month, quarter, year, custom }

extension ReportKindApi on ReportKind {
  String get apiValue => switch (this) {
    ReportKind.virtualAddresses => 'virtual_addresses',
    ReportKind.meetingRooms => 'meeting_rooms',
    _ => name,
  };
}

final class ReportExportRequest {
  const ReportExportRequest({
    required this.propertyId,
    required this.kind,
    required this.format,
    required this.locale,
    required this.from,
    required this.to,
    this.status,
  });
  final String propertyId;
  final ReportKind kind;
  final ReportFileFormat format;
  final String locale;
  final String from;
  final String to;
  final String? status;
}

final class ReportFile {
  const ReportFile({
    required this.bytes,
    required this.fileName,
    required this.contentType,
  });
  final Uint8List bytes;
  final String fileName;
  final String contentType;
}
