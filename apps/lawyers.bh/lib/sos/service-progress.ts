export function nextServiceStatus(workflow: string, status: string, action: string): 'in_progress' | 'completed' | null {
  if (action === 'complete' && status === 'in_progress') return 'completed';
  if (action === 'start' && (
    (workflow === 'emergency_dispatch' && status === 'arrived') ||
    (workflow === 'direct_consultation' && status === 'mobilizing')
  )) return 'in_progress';
  return null;
}
