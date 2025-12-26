
import { FamilyState, Task, Reward } from '../types';
import { FIXED_SYNC_ID } from '../constants';

export function generateHTMLReport(
  state: FamilyState
): string {
  const now = new Date();
  const reportDate = now.toLocaleDateString('zh-CN');

  // Categorize for handbook style
  const learningTasks = state.tasks.filter(t => t.category === 'learning');
  const choresTasks = state.tasks.filter(t => t.category === 'chores');
  const disciplineTasks = state.tasks.filter(t => t.category === 'discipline');
  const penaltyTasks = state.tasks.filter(t => t.category === 'penalty');
  const rewardItems = state.rewards;

  const chunkItems = (items: any[]) => {
    const chunks = [];
    for (let i = 0; i < items.length; i += 2) {
      chunks.push([items[i], items[i+1]]);
    }
    return chunks;
  };

  const renderTaskTable = (title: string, items: Task[]) => {
    if (items.length === 0) return '';
    return `
      <div class="category-title">${title}</div>
      <table>
          <thead>
              <tr>
                  <th class="col-pts">元气值</th>
                  <th class="col-desc">事项说明</th>
                  <th class="col-freq">周期</th>
                  <th class="col-pts">元气值</th>
                  <th class="col-desc">事项说明</th>
                  <th class="col-freq">周期</th>
              </tr>
          </thead>
          <tbody>
              ${chunkItems(items).map(pair => `
              <tr>
                  <td class="col-pts">${pair[0].points > 0 ? '+' : ''}${pair[0].points}</td>
                  <td class="col-desc"><b>${pair[0].title}</b><br><small>${pair[0].description || ''}</small></td>
                  <td class="col-freq">${pair[0].frequency}</td>
                  ${pair[1] ? `
                  <td class="col-pts">${pair[1].points > 0 ? '+' : ''}${pair[1].points}</td>
                  <td class="col-desc"><b>${pair[1].title}</b><br><small>${pair[1].description || ''}</small></td>
                  <td class="col-freq">${pair[1].frequency}</td>
                  ` : '<td></td><td></td><td></td>'}
              </tr>`).join('')}
          </tbody>
      </table>
    `;
  };

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>家庭积分银行制度手册</title>
    <style>
        @media print {
            @page { margin: 12mm; }
            body { padding: 0; }
        }
        body {
            font-family: "PingFang SC", "STHeiti", sans-serif;
            color: #111;
            line-height: 1.3;
            padding: 20px;
            background: #fff;
            font-size: 11px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            border-bottom: 2px solid #000;
            padding-bottom: 12px;
            margin-bottom: 25px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        .header h1 {
            font-size: 26px;
            font-weight: 800;
            margin: 0;
            letter-spacing: 2px;
        }
        .header-info {
            text-align: right;
            font-size: 9px;
            color: #555;
            font-weight: 600;
        }
        .section-title {
            font-size: 18px;
            font-weight: 800;
            margin: 25px 0 10px 0;
            border-bottom: 1px solid #000;
            padding-bottom: 4px;
            text-transform: uppercase;
        }
        .category-title {
            font-size: 13px;
            font-weight: 700;
            margin: 15px 0 8px 0;
            display: flex;
            align-items: center;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        th, td {
            border: 0.5px solid #000;
            padding: 7px 5px;
            text-align: left;
        }
        th {
            background: #f9f9f9;
            font-weight: 700;
            font-size: 9px;
            text-align: center;
        }
        .col-pts { width: 45px; font-weight: 800; text-align: center; }
        .col-freq { width: 45px; text-align: center; font-size: 9px; color: #444; }
        .col-desc { font-weight: normal; }
        small { font-size: 8px; color: #666; font-weight: 400; display: block; margin-top: 2px; }

        .rules-footer {
            margin-top: 40px;
            font-size: 8px;
            color: #888;
            text-align: center;
            border-top: 1px dashed #eee;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>家庭积分银行制度手册</h1>
            <div class="header-info">
                发布日期：${reportDate}<br>
                同步编号：${FIXED_SYNC_ID}
            </div>
        </div>

        <div class="section-title">壹 · 任务中心规则 (Tasks)</div>
        
        ${renderTaskTable('📘 学习习惯类', learningTasks)}
        ${renderTaskTable('🧹 家务帮手类', choresTasks)}
        ${renderTaskTable('⏰ 自律养成类', disciplineTasks)}
        
        <div class="section-title">贰 · 能量扣减警告 (Penalty)</div>
        ${renderTaskTable('⚠️ 违规警示项', penaltyTasks)}

        <div class="section-title">叁 · 梦想商店清单 (Rewards)</div>
        <table>
            <thead>
                <tr>
                    <th class="col-pts">元气值</th>
                    <th class="col-desc">奖品/特权名称</th>
                    <th class="col-freq">类别</th>
                    <th class="col-pts">元气值</th>
                    <th class="col-desc">奖品/特权名称</th>
                    <th class="col-freq">类别</th>
                </tr>
            </thead>
            <tbody>
                ${chunkItems(rewardItems).map(pair => `
                <tr>
                    <td class="col-pts">${pair[0].points}</td>
                    <td class="col-desc"><b>${pair[0].title}</b></td>
                    <td class="col-freq">${pair[0].type[0]}</td>
                    ${pair[1] ? `
                    <td class="col-pts">${pair[1].points}</td>
                    <td class="col-desc"><b>${pair[1].title}</b></td>
                    <td class="col-freq">${pair[1].type[0]}</td>
                    ` : '<td></td><td></td><td></td>'}
                </tr>`).join('')}
            </tbody>
        </table>

        <div class="rules-footer">
            王氏家庭积分银行 · 系统自动同步与存档<br>
            旨在培养良好的学习习惯与家庭责任感
        </div>
    </div>
</body>
</html>`;
  return html;
}

export function printReport(state: FamilyState): void {
  const html = generateHTMLReport(state);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  }
}

export function exportToHTML(state: FamilyState): void {
  const html = generateHTMLReport(state);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `家庭积分制度手册.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
