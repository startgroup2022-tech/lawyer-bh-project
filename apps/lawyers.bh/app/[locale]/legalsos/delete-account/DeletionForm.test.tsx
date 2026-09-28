import { renderToStaticMarkup } from 'react-dom/server';
import { describe,expect,it } from 'vitest';
import DeletionForm from './DeletionForm';
describe('external deletion form',()=>{
  it.each([true,false])('requires credentials and labels app-only scope (Arabic=%s)',ar=>{
    const html=renderToStaticMarkup(<DeletionForm ar={ar} enabled/>);
    expect(html).toContain('type="password"');expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain('required');expect(html).toContain(ar?'30 يومًا':'30 days');
    expect(html).toContain(ar?'الموقع':'website');expect(html).not.toContain('type="hidden"');
  });
  it('shows unavailable status without a misleading working form before activation',()=>{
    const html=renderToStaticMarkup(<DeletionForm ar={false} enabled={false}/>);
    expect(html).toContain('role="status"');expect(html).not.toContain('<form');
  });
});
