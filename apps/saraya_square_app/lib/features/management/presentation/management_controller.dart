import 'package:flutter/foundation.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/features/management/data/management_repository.dart';
import 'package:saraya_square_app/features/management/domain/management_models.dart';

final class ManagementController extends ChangeNotifier {
  ManagementController(this._repository, {required this.resource});

  final ManagementRepository _repository;
  final ManagementResource resource;

  List<ManagementRecord> _items = const [];
  List<ManagementRecord> get items => _items;
  String? nextCursor;
  bool isLoading = false;
  bool isRefreshing = false;
  bool isSubmitting = false;
  Object? loadError;
  Map<String, List<String>> fieldErrors = const {};
  late ManagementQuery query;

  Future<void> load(String propertyId) async {
    query = ManagementQuery(propertyId: propertyId);
    isLoading = true;
    loadError = null;
    notifyListeners();
    await _replace(query);
    isLoading = false;
    notifyListeners();
  }

  Future<void> search(String value) => _refresh(
    query.copyWith(
      search: value.trim(),
      clearSearch: value.trim().isEmpty,
      clearCursor: true,
    ),
  );

  Future<void> filter(String? value) {
    final isStaff = resource == ManagementResource.staff;
    return _refresh(
      query.copyWith(
        role: isStaff ? value : null,
        clearRole: isStaff && value == null,
        status: isStaff ? null : value,
        clearStatus: !isStaff && value == null,
        clearCursor: true,
      ),
    );
  }

  Future<void> refresh() => _refresh(query.copyWith(clearCursor: true));

  Future<void> loadMore() async {
    final cursor = nextCursor;
    if (cursor == null || isRefreshing) return;
    isRefreshing = true;
    notifyListeners();
    try {
      final nextQuery = query.copyWith(cursor: cursor);
      final page = await _repository.list(resource, nextQuery);
      query = nextQuery;
      _items = List.unmodifiable([..._items, ...page.items]);
      nextCursor = page.nextCursor;
      loadError = null;
    } catch (error) {
      loadError = error;
    } finally {
      isRefreshing = false;
      notifyListeners();
    }
  }

  Future<bool> save(ManagementInput input, {ManagementRecord? existing}) async {
    isSubmitting = true;
    fieldErrors = const {};
    notifyListeners();
    try {
      if (existing == null) {
        await _repository.create(resource, query, input);
      } else {
        await _repository.update(resource, query, existing.id, input);
      }
      await _refresh(query.copyWith(clearCursor: true));
      return true;
    } on ApiError catch (error) {
      fieldErrors = error.fieldErrors;
      return false;
    } finally {
      isSubmitting = false;
      notifyListeners();
    }
  }

  Future<bool> deactivate(String id) async {
    isSubmitting = true;
    notifyListeners();
    try {
      await _repository.deactivate(resource, query, id);
      await _refresh(query.copyWith(clearCursor: true));
      return true;
    } on ApiError {
      return false;
    } finally {
      isSubmitting = false;
      notifyListeners();
    }
  }

  Future<void> _refresh(ManagementQuery nextQuery) async {
    isRefreshing = true;
    loadError = null;
    notifyListeners();
    await _replace(nextQuery);
    isRefreshing = false;
    notifyListeners();
  }

  Future<void> _replace(ManagementQuery nextQuery) async {
    try {
      final page = await _repository.list(resource, nextQuery);
      query = nextQuery;
      _items = page.items;
      nextCursor = page.nextCursor;
      loadError = null;
    } catch (error) {
      loadError = error;
    }
  }
}
