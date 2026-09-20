import { Check, MousePointer2, RotateCcw, Sparkles } from 'lucide-react';
import { Button, IconButton } from '../components/ui';
import { usePreferences } from './PreferencesProvider';
import { defaultPreferences, fontOptions } from './model';

export function AppearanceSettings() {
  const { preferences, setPreferences, storageError } = usePreferences();
  return (
    <div className="appearance-settings">
      <section className="appearance-section">
        <div className="appearance-heading">
          <div>
            <h3>找到舒服的字体</h3>
            <p>选择即应用到整个界面，重启后也会记住。</p>
          </div>
          <Button
            className="text-button"
            onClick={() =>
              setPreferences({
                font: defaultPreferences.font,
                fontSize: defaultPreferences.fontSize,
                motion: defaultPreferences.motion,
              })
            }
          >
            <RotateCcw size={14} />
            恢复外观默认
          </Button>
        </div>
        <div className="font-options" role="radiogroup" aria-label="界面字体">
          {fontOptions.map((font) => (
            <Button
              key={font.id}
              role="radio"
              aria-checked={preferences.font === font.id}
              tabIndex={preferences.font === font.id ? 0 : -1}
              className={`font-option ${preferences.font === font.id ? 'selected' : ''}`}
              onClick={() => setPreferences({ font: font.id })}
              onKeyDown={(event) => {
                if (
                  !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const current = fontOptions.findIndex((option) => option.id === font.id);
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? fontOptions.length - 1
                      : (current +
                          (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) +
                          fontOptions.length) %
                        fontOptions.length;
                setPreferences({ font: fontOptions[next].id });
                event.currentTarget.parentElement
                  ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
                  [next]?.focus();
              }}
            >
              <span className="font-option-title">
                {font.name}
                {preferences.font === font.id && <Check size={16} />}
              </span>
              <span className="font-sample" data-font={font.id}>
                把日常，记清楚。
              </span>
              <span className="font-sample-number" data-font={font.id}>
                Ludian · 09:20 · 0123456789
              </span>
              <small>{font.detail}</small>
            </Button>
          ))}
        </div>
        <p className="appearance-note">
          三款内置字体可离线使用；少见字自动使用完整黑体字库补齐。系统字体随电脑而定。
        </p>
      </section>
      <section className="appearance-section appearance-inline">
        <div>
          <h3>文字大小</h3>
          <p>通过字号调整，不缩放或拉伸字形。</p>
        </div>
        <div className="segmented" role="group" aria-label="文字大小">
          {([14, 15, 16] as const).map((size) => (
            <Button
              key={size}
              aria-pressed={preferences.fontSize === size}
              onClick={() => setPreferences({ fontSize: size })}
            >
              {size === 14 ? '标准' : size === 15 ? '舒适' : '大字'} · {size}
            </Button>
          ))}
        </div>
      </section>
      <section className="appearance-section appearance-inline">
        <div>
          <h3>交互与动效</h3>
          <p>短促的反馈，帮助你看清正在操作的位置。</p>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={preferences.motion === 'reduced'}
            onChange={(e) => setPreferences({ motion: e.target.checked ? 'reduced' : 'system' })}
          />
          减少动态效果
        </label>
      </section>
      <div className="interaction-preview">
        <div>
          <Sparkles size={20} />
          <strong>试试鼠标悬停、按下或键盘 Tab</strong>
          <p>按钮、图标和提示使用同一套反馈。开启减少动态效果后，仍保留高亮与文字提示。</p>
        </div>
        <IconButton label="图标提示也支持键盘焦点">
          <MousePointer2 size={19} />
        </IconButton>
      </div>
      <p className="appearance-note" role="status">
        {storageError
          ? '当前无法写入偏好，改动仅在本次打开时生效。考勤数据不受影响。'
          : '外观偏好仅保存在这台设备，不会更改考勤或其他班级的数据。系统开启减少动态效果时，应用会自动遵循。'}
      </p>
    </div>
  );
}
