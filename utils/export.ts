
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
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-shadow: none !important; }
            body { padding: 0; background: #fff; }
            .container { max-width: 100%; margin: 0; }
            table { box-shadow: none !important; border-radius: 4px !important; }
            .header, .section-title, .rules-footer { box-shadow: none !important; }
        }
        :root {
            --primary: #FF4D94;
            --secondary: #7C4DFF;
            --accent: #10B981;
            --amber: #F59E0B;
            --bg: #FFF8FB;
        }
        body {
            font-family: "PingFang SC", "STHeiti", sans-serif;
            color: #0f172a;
            line-height: 1.35;
            padding: 20px;
            background: #fff;
            font-size: 11px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            border-bottom: 3px solid var(--primary);
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
            color: var(--secondary);
        }
        .header-info {
            text-align: right;
            font-size: 9px;
            color: #475569;
            font-weight: 600;
        }
        .section-title {
            font-size: 18px;
            font-weight: 800;
            margin: 25px 0 12px 0;
            border-bottom: 2px solid rgba(255, 77, 148, 0.35);
            padding-bottom: 6px;
            text-transform: uppercase;
            color: var(--primary);
        }
        .category-title {
            font-size: 13px;
            font-weight: 800;
            margin: 15px 0 8px 0;
            display: flex;
            align-items: center;
            gap: 8px;
            color: #0f172a;
        }
        .category-title::before {
            content: "";
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 999px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            box-shadow: 0 0 0 3px rgba(255,77,148,0.12);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            background: #fff;
            overflow: hidden;
            border-radius: 8px;
            box-shadow: 0 6px 18px -14px rgba(124,77,255,0.30);
        }
        th, td {
            border: 0.5px solid rgba(148, 163, 184, 0.6);
            padding: 7px 6px;
            text-align: left;
        }
        th {
            background: linear-gradient(90deg, #FFE4F1, #E9DCFF);
            color: #5B1B70;
            font-weight: 800;
            font-size: 9px;
            text-align: center;
            letter-spacing: 0.05em;
        }
        tr:nth-child(odd) td { background: #FFF9FD; }
        tr:nth-child(even) td { background: #F7F5FF; }
        .col-pts { width: 48px; font-weight: 900; text-align: center; color: var(--primary); }
        .col-freq { width: 48px; text-align: center; font-size: 9px; color: #475569; font-weight: 700; }
        .col-desc { font-weight: 600; color: #0f172a; }
        small { font-size: 8px; color: #6b7280; font-weight: 500; display: block; margin-top: 3px; }

        .rules-footer {
            margin-top: 40px;
            font-size: 8px;
            color: #475569;
            text-align: center;
            border-top: 1px dashed rgba(148, 163, 184, 0.7);
            padding-top: 20px;
            background: linear-gradient(90deg, rgba(255,77,148,0.04), rgba(124,77,255,0.04));
            box-shadow: 0 4px 16px -12px rgba(15,23,42,0.25);
            border-radius: 8px;
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
