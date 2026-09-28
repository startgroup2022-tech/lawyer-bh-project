import 'dart:typed_data';

final class SarayaDocument {
  const SarayaDocument({
    required this.id,
    required this.propertyId,
    required this.category,
    required this.title,
    required this.originalName,
    required this.contentType,
    required this.sizeBytes,
    required this.status,
    required this.createdAt,
    this.unitId,
    this.tenantOrganizationId,
    this.leaseId,
    this.expiresOn,
    this.unitNumber,
    this.tenantNameAr,
    this.tenantNameEn,
    this.uploadedByNameAr,
    this.uploadedByNameEn,
  });

  factory SarayaDocument.fromJson(Map<String, Object?> json) => SarayaDocument(
    id: json['id']! as String,
    propertyId: json['propertyId']! as String,
    unitId: json['unitId'] as String?,
    tenantOrganizationId: json['tenantOrganizationId'] as String?,
    leaseId: json['leaseId'] as String?,
    category: json['category']! as String,
    title: json['title']! as String,
    originalName: json['originalName']! as String,
    contentType: json['contentType']! as String,
    sizeBytes: json['sizeBytes']! as int,
    status: json['status']! as String,
    expiresOn: json['expiresOn'] as String?,
    createdAt: json['createdAt']! as String,
    unitNumber: json['unitNumber'] as String?,
    tenantNameAr: json['tenantNameAr'] as String?,
    tenantNameEn: json['tenantNameEn'] as String?,
    uploadedByNameAr: json['uploadedByNameAr'] as String?,
    uploadedByNameEn: json['uploadedByNameEn'] as String?,
  );

  final String id;
  final String propertyId;
  final String? unitId;
  final String? tenantOrganizationId;
  final String? leaseId;
  final String category;
  final String title;
  final String originalName;
  final String contentType;
  final int sizeBytes;
  final String status;
  final String? expiresOn;
  final String createdAt;
  final String? unitNumber;
  final String? tenantNameAr;
  final String? tenantNameEn;
  final String? uploadedByNameAr;
  final String? uploadedByNameEn;
}

final class DocumentUploadInput {
  const DocumentUploadInput({
    required this.title,
    required this.fileName,
    required this.contentType,
    required this.bytes,
  });

  final String title;
  final String fileName;
  final String contentType;
  final Uint8List bytes;
}

final class PickedDocumentFile {
  const PickedDocumentFile({
    required this.name,
    required this.contentType,
    required this.bytes,
  });

  final String name;
  final String contentType;
  final Uint8List bytes;
}

final class DocumentInput {
  const DocumentInput({
    required this.title,
    required this.category,
    required this.status,
    this.expiresOn,
  });
  factory DocumentInput.fromDocument(SarayaDocument document) => DocumentInput(
    title: document.title,
    category: document.category,
    status: document.status,
    expiresOn: document.expiresOn,
  );
  final String title;
  final String category;
  final String status;
  final String? expiresOn;
  Map<String, Object?> toJson() => {
    'title': title,
    'category': category,
    'status': status,
    'expiresOn': expiresOn,
  };
}
