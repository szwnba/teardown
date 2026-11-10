# Teardown · 机器 3D 拆解模拟器合集

用 [teardown skill](https://github.com/szwnba/johnson-skills)（源自 whaleyxbt/claude-motion）构建的交互式 3D 机器模拟器集合。每台机器一个目录：离线单文件 HTML（双击即开）+ 导览成片 + 审片留档。

## v8/ · Cross-plane V8 四冲程发动机

90° V 形夹角 · 5.8 L · 点火顺序 1-8-4-3-6-5-7-2

| 文件 | 说明 |
|---|---|
| `v8/v8-live.html` | **交互模拟器**（825 KB，离线单文件）：拖拽环绕、玻璃/剖面/实体三档剖切、点火顺序选缸追踪、示功图与气门正时实时联动、转速 700–2400 RPM、暂停与 ±15° 步进、`H` 收面板；无操作时自动巡演 |
| `v8/v8-film.html` | 同一机器的 26 s 自动导览回放页（录片源） |
| `v8/v8.mp4` | 导览成片（720p30 + 合成配乐，26 s，−14 LUFS） |
| `v8/review/` | 审片留档：每 2 s 节拍拼图、结尾帧、音频波形检查表 |
| `v8/qa/` | 自动化验证脚本：DOM 文字裁切测量、按钮接线合成事件测试、页面冒烟 |

一切读数（活塞位移、气门升程、缸内压力）都由同一个曲轴角函数驱动 —— 面板上的数字和 3D 里的运动不可能打架。

### 重新构建 / 重新录片

```bash
# 构建（产物约 800 KB，离线可用）
node ~/.agents/skills/teardown/sims/build.mjs v8-live
node ~/.agents/skills/teardown/sims/build.mjs v8-film

# 本机（无硬件 WebGL 的 VM）录片要点：CHROMIUM 指向缓存浏览器 + ANGLE 走 llvmpipe GL 路径（快 5 倍）
# 详见 memory：env-teardown-render-box
```
