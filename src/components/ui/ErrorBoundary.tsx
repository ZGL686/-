import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Component } from 'react';
import { Button } from './Button';

export class ErrorBoundary extends Component<
  { children: ReactNode; page?: boolean; onHome?: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className={this.props.page ? 'page-error' : 'fatal'} role="alert">
        <AlertTriangle size={30} />
        <h2>这个页面暂时出了点问题</h2>
        <p>已保存的考勤仍在。可以重新打开页面，或返回课程表。</p>
        <div className="error-actions">
          <Button
            onClick={() =>
              this.props.page ? this.setState({ failed: false }) : window.location.reload()
            }
          >
            <RotateCcw size={15} />
            重新打开
          </Button>
          {this.props.onHome && <Button onClick={this.props.onHome}>返回课程表</Button>}
        </div>
      </div>
    );
  }
}
