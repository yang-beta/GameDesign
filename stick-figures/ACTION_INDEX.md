# Ryu（Street Fighter II: Champion Edition）精靈圖動作分類

來源圖：`assets` 內 SF2 CE Ryu sprite sheet（1200×2675）

## 是否適合作為遊戲動作拆分參考？

**適合。** 這是典型格鬥遊戲精靈表：動作多半依列／區段排好，幀序清楚，可直接對應 idle／walk／攻擊／特殊技／受擊／倒地／勝利等狀態機。注意部分列會把「多個短動作」排在同一橫列，拆分時要以**姿勢突變／起手－出招－收招**判斷邊界，不要只靠列數。

---

## 動作總覽（共 17 個動作／資產群組）

| # | 動作名稱（中） | 動作名稱（英） | 說明 |
|---|----------------|----------------|------|
| 01 | 待機 | Idle Stance | 最上方列。戰鬥預備勢＋呼吸起伏（本次已轉火柴人） |
| 02 | 行走 | Walk | 前進／後退步伐循環 |
| 03 | 站立拳 | Standing Punches | 弱／中／強拳等站立拳擊 |
| 04 | 站立踢 | Standing Kicks | 站立低踢、高踢、迴旋／斧踢等 |
| 05 | 近身攻擊 | Close Attacks | 近距離肘／膝等 compact 攻擊 |
| 06 | 跳躍 | Jump | 垂直跳、斜跳起跳／空中／落地 |
| 07 | 跳躍攻擊 | Jump Attacks | 空中拳、空中踢 |
| 08 | 旋風腳 | Tatsumaki Senpu Kyaku | 空中旋轉踢（Hurricane Kick） |
| 09 | 蹲下 | Crouch | 蹲下過渡與蹲姿 |
| 10 | 蹲下拳 | Crouching Punches | 蹲弱／中／強拳 |
| 11 | 蹲下踢／掃堂腿 | Crouching Kicks / Sweep | 蹲踢與貼地掃腿 |
| 12 | 波動拳（蓄力） | Hadoken Startup | 雙手後拉蓄力 |
| 13 | 波動拳（放出＋彈體） | Hadoken Release + Projectile | 前推放出與藍色氣彈幀 |
| 14 | 昇龍拳 | Shoryuken | 上鉤跳躍升龍 |
| 15 | 受擊／暈眩 | Hit Stun / Dizzy | 被打反應、暈眩晃動 |
| 16 | 擊飛／倒地／起身 | Launch / Knockdown / Wake-up | 擊飛、著地、滾動、起身 |
| 17 | 勝利姿勢＋UI | Victory + UI | 勝利動作、頭帶整理；底部肖像／選單圖示 |

> 底部列另含 P1／P2 調色肖像與 credits，屬 **UI／展示資產**，一併歸入 #17。

---

## 本次轉換範圍

- **僅動作 01：待機（Idle）**
- 輸出目錄：`stick-figures/01-idle/`
  - `frame_01.png` … `frame_08.png`：各幀白底火柴人
  - `strip.png`：橫向總覽
  - `preview.gif`：循環預覽
  - `comparison.png`：原圖幀 vs 火柴人對照
  - `joints.json`：各幀關節座標

其餘動作請確認待機火柴人無誤後，再指示是否接續。
