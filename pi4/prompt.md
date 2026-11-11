# 树莓派 4 Model B ·「开机即拆」拆解模拟器 — 构建提示词

> 本文件是 pi4 拆解模拟器的构建任务书（唯一数据源），构建按 [teardown skill](https://github.com/whaleyxbt/claude-motion) 的规则执行。
> 规格：4 GB / rev 1.4 · UI 中英双语（中文主、英文辅）· 交付 = 交互页 + 26 s 配乐导览片 + 审片/QA 留档 + Pages 发布。

## 0 · 一句话目标

做一个「上电能跑、拖杆即拆」的树莓派 4B 拆解页：访客看到板子上电、走完真实启动五阶段跑起来；拖动滑杆把它沿 Z 轴炸开为「顶面器件 → 六层 PCB → 底面器件」三层；点任意芯片即隔离特写 + 真实规格卡。所有面板读数（电压轨、启动相位、CPU 频率、结温、SD→RAM 装载）与 3D 运动出自同一个 `boot(t)` 函数，数字与画面不可能打架。文案中文主 + 英文辅（如「四核 Cortex-A72 / quad-core A72」）。

## 1 · 真实数据（唯一数据源，已核实）

### 板卡（官方 datasheet RP-008341）

- PCB **85.6 × 56.5 mm**，带排针高约 17 mm，重 **46 g**，**6 层板**（LPDDR4 等长线所需）
- 供电：USB-C **5 V / 3 A**；典型功耗 ≈0.6 A（3 W），满载 ≈1.25 A
- SoC 结温上限 **85 °C**（降频线）

### 顶面器件（以官方产品正/背面图逐一对位）

| 器件 | 规格 | 位置 |
|---|---|---|
| **BCM2711** SoC | 4× Cortex-A72 @ **1.8 GHz**（rev 1.4）+ VideoCore VI GPU | 板中央 |
| **4 GB LPDDR4-3200** | **分立单颗**，SoC 旁 —— 4B 不再是 Pi 1–3 的 PoP 叠封（叙事点） | SoC 与 VL805 之间 |
| **VL805**（VIA Labs） | USB 3.0 xHCI 控制器，固件开机由 EEPROM 烧入 | 内存与 USB 堆之间 |
| **CYW43455**（Cypress） | 双频 802.11ac + BT 5.0/BLE，**金属屏蔽罩下**（罩可滑开） | USB 侧角落 |
| **BCM54213**（Broadcom） | 千兆以太 PHY（独享带宽，非 Pi 3 的 USB 共享） | RJ45 旁 |
| **MXL7704**（MaxLinear） | PMIC，4 路 buck：3.3 V / 1.8 V / DDR 轨 / 核心轨 ~0.85 V | USB-C 旁 |
| 40 针 GPIO | **27 个可编程**；BCM2711 复用最多 6×UART / 6×I²C / 5×SPI | 上长边 |
| 其他 | CSI / DSI 15 针座、2× USB 3.0、2× USB 2.0、RJ45（PoE 4 针座）、2× micro-HDMI 4Kp60、USB-C、3.5 mm A/V、红 PWR / 绿 ACT 指示灯 | — |

### 底面器件

- **microSD 推入式卡槽**（卡从侧边插入）
- **Winbond 16 Mbit（2 MB）SPI EEPROM** —— bootloader 与 VL805 固件都藏在这颗里（叙事点）
- 去耦电容阵列 / 测试点

### 启动五阶段（`boot(t)` 相位，真实顺序）

1. 5 V 上电 → MXL7704 四轨依次爬升 → power-good
2. SoC 内 bootrom 读 SPI EEPROM → 引导器运行，同时把 VL805 固件烧给 USB 控制器
3. 读 microSD FAT32 启动分区 → `start4.elf` + `fixup4.dat`（GPU 固件）
4. `kernel8.img` 装入 LPDDR4 → 4× A72 核心上线（0→600→1800 MHz）
5. 内核：设备树 → PHY 链路 / 无线 / 根文件系统 → 用户空间就绪

真实全程 ≈15–20 s，影片压缩呈现、横轴标注真实秒数。

## 2 · 单一数据流

- `boot(t)`：纯函数 → 全部运行读数（各轨电压、相位、4 核频率负载、结温曲线、ACT 闪烁序列、SD→RAM 已装载 MB、USB 枚举时刻、网口/无线活动脉冲）。零 `Math.random`、零状态残留
- `pose(u)`：u∈[0,1] → 器件层归属与爆炸偏移（顶面 +Z / 底面 −Z / 屏蔽罩侧滑 / PCB 内层展开）
- 3D 每帧 = pose∘boot；控制台同 state 重绘。影片里 u、t、相机皆主时钟函数；live 页 u 为滑杆、t 为可擦洗启动时钟，两页共用同一 `boot.js`

## 3 · 造型与舞台

- 全部代码建模：PCB 圆角矩形 + 4 安装孔 + 丝印（型号 / 树莓 logo / CE）、阻焊绿、QFP/BGA/QFN 封装语言、屏蔽罩拉丝、连接器铣削
- 端口按真实边位摆放，构建时对照官方正/背面产品图逐帧比对
- 浅色影棚 + **单一强调色（树莓红系）**只标「此刻正在工作的部分」：上电时 PMIC、读卡时 SD→RAM 走线、枚举时 VL805
- PCB **x-ray 模式**：六层叠层展开 + DDR 等长线 / 电源树高亮
- 相机：整板 3/4 主视角、顶面浮起沿长边扫、底面翻转、SoC 推入封装剖面；近白器件加墨描边

## 4 · 控制台（1600×900 固定布局，双语）

- 左：器件清单 **9 组**（SoC / RAM / WiFi（罩）/ VL805 / PMIC / PHY / EEPROM / microSD / GPIO 口组），点击 = 隔离 + 相机
- 右上：启动相位时间轴（5 相位，可点跳）+ 电压示波器（5 V 输入 + 4 路输出爬升）
- 右下：4 核频率柱 + 结温曲线（85 °C 降频线）+ SD→RAM 装载量
- 底：拆解滑杆（吸附 5 档：整机 / 屏蔽罩 / 顶面 / PCB 内层 / 全炸开）+ 启动时钟 scrubber
- 剖切三档：实体 / x-ray / 六层展开（对齐 v8 的 cutaway 档位习惯）
- 中文标签 ≥34 px（1080 基准）、英文辅标 ≥24 px；引线不压器件；面板宽度按最长双语串设计

## 5 · 26 s 导览片（beats → timeline.json）

| t (s) | 内容 |
|---|---|
| 0.0 | hero：整机 3/4，红灯亮绿灯闪，标题「树莓派 4B · 开机即拆 / Boot it, then take it apart」 |
| 3.5 | 端口巡礼：左短边 USB-C / µHDMI×2 / 音频、右短边 USB×4 / RJ45 逐个标注 |
| 7.0 | 顶面炸开：SoC、RAM（点明分立 LPDDR4 非 PoP）、罩滑开露 CYW43455、VL805、PMIC、PHY |
| 11.0 | 翻转底面：microSD、2 MB EEPROM（「bootloader + VL805 固件在此」）、测试点 |
| 14.5 | 隔离 SoC：四核 A72 图解 + x-ray 六层叠层 |
| 18.0 | 完整启动一遍：轨道爬升 → EEPROM → start4.elf → kernel 入内存 → 4 核上线 → USB 枚举闪 / 网口链路，面板全程联动 |
| 23.0 | 复原收尾：整机 hero + 数据卡（85.6 × 56.5 mm · 46 g · 4×A72 1.8 GHz · 4 GB LPDDR4-3200） |

- 每拍停留 ≥1 s + 0.25 s/词；机器占视口 60–70%
- 配乐：和弦 bed + 每层浮起 soft thud + kernel 时刻 chime + 收尾低频；**全部时刻取自 timeline.json**

## 6 · 工程与验收

- 源码与 v8 同构放 skill：`sims/pi4-shared/{boot,board,stage,console,film,live}.js` + `score.py`；`sims/pi4-{live,film}/main.js` 转发
- 单文件 <1 MB；TIERS 质量分级（无 AO / 低像素比 / 隔帧重绘面板）；shader 预热
- 审片清单：器件不穿模、端口边位与官方图一致、面板数字 = 画面运动、每拍可读、标签不裁切、bloom 内发光 <1.0、近白件有描边
- QA 三件：冒烟（无头逐档点击）、接线（boot(t) 抽样喂 3D 与面板读数一致）、裁切（双语标签 DOM 测量）

## 参考资料（对位基准）

- 官方产品页（正/背面图、规格）：https://www.raspberrypi.com/products/raspberry-pi-4-model-b/
- 官方 datasheet RP-008341（尺寸 / 功耗 / 温度）：https://pip.raspberrypi.com/documents/RP-008341-DS-raspberry-pi-4-datasheet.pdf
- MXL7704 datasheet（电压轨）：https://www.maxlinear.com/ds/mxl7704.pdf
- 官方 Boot EEPROM 文档（启动时序 / VL805 固件）：https://www.raspberrypi.com/documentation/computers/raspberry-pi.html
- BCM2711 外设复用（6×UART / 6×I²C / 5×SPI）：https://www.studiopieters.nl/raspberry-pi-4-pinout
