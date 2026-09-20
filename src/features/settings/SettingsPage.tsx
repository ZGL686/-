import { useState } from 'react';
import { Button, PageHeading } from '../../components/ui';
import { AppearanceSettings } from '../../preferences/AppearanceSettings';
import { TermSettings } from './TermSettings';
export function Settings() {
  const [tab, setTab] = useState<'term' | 'appearance'>('term');
  return (
    <>
      <PageHeading page="settings" description="学期安排与个人外观，都可以在这里调整。" />
      <div className="settings-tabs" role="tablist" aria-label="设置分类">
        <Button role="tab" aria-selected={tab === 'term'} onClick={() => setTab('term')}>
          学期设置
        </Button>
        <Button
          role="tab"
          aria-selected={tab === 'appearance'}
          onClick={() => setTab('appearance')}
        >
          外观与交互
        </Button>
      </div>
      <div role="tabpanel" aria-label={tab === 'term' ? '学期设置' : '外观与交互'}>
        {tab === 'term' ? <TermSettings /> : <AppearanceSettings />}
      </div>
    </>
  );
}
