# Demo Script

## 3-Minute Version

### 0:00 - 0:30

“HyperForge 是一个面向 EvoMap Case A 的多 Agent 协作 Demo。我们先接收复杂任务，然后由主控 Agent 拆成可执行 DAG，再让 Analyst、Builder、Validator 分工处理。”

### 0:30 - 1:10

打开首页，输入示例任务，选择 `mock` 模式并启动。

强调：

- 这不是静态页面
- 后端真实执行了一次 orchestration
- 所有节点状态与产物都被持久化到本地 SQLite

### 1:10 - 2:00

进入 run 页面，依次展示：

- Task DAG
- Agent Status
- Timeline

讲解：

- Analyst 先做上下文分析与信号提取
- Builder 生成实现方案和 mock patch
- Validator 生成验收与回归验证计划

### 2:00 - 2:40

展示 Gene / Capsule 区域：

- 每个成功子任务都会形成结构化 Gene
- 至少一个 Capsule 会和对应 Gene 组成 bundle
- `asset_id` 使用 canonical JSON + SHA-256 本地计算

### 2:40 - 3:00

展示 Recipe / Organism 区域：

- 主控从 Gene 中组合 Recipe
- 调用 publish 和 express
- 最终得到一个可展示的 Organism 状态

收尾：

“第一阶段我们先把闭环打通；第二阶段会替换真实 repo sandbox，并接入 EvoMap session、reuse scoring 和 correction 链路。”

## 5-Minute Version

### 0:00 - 0:50 背景

“EvoMap 强调能力的沉淀、传播和继承。HyperForge 不是只做一次性完成任务，而是把多 Agent 执行经验沉淀成 Gene 和 Capsule，并继续往 Recipe/Organism 方向推进。”

### 0:50 - 1:40 首页输入

展示首页：

- 项目标题
- 示例任务
- mock/live 切换
- 启动按钮

说明 mock/live 设计：

- mock 用于比赛稳定演示
- live 用于对接真实 EvoMap 最小闭环

### 1:40 - 2:40 Run Dashboard

展示 DAG：

- 明确依赖关系
- 并不是简单文案堆砌

展示 Agent Status：

- 统一 Agent 接口
- 后续可以很容易增加更多 Agent 类型

展示 Timeline：

- 可以看到规划、执行、资产生成、Recipe、Organism 的全过程

### 2:40 - 3:50 Gene / Capsule / Recipe

说明资产层设计：

- Gene：可复用策略模板
- Capsule：成功执行结果和审计痕迹
- Recipe：多个 Gene 的顺序组合
- Organism：Recipe 表达后的执行实例

强调：

- 所有 EvoMap 协议细节都封装在 `lib/evomap`
- UI 没有直接耦合平台协议

### 3:50 - 4:40 持久化与可扩展性

说明 SQLite 数据：

- run
- subtask
- agent execution
- gene/capsule
- recipe/organism
- timeline

说明二期扩展位：

- real fetch/apply/validate/reused publish
- session/board collaboration
- real sandbox
- memory graph
- multi-model routing

### 4:40 - 5:00 结尾

“我们这一阶段追求的是完整、稳定、可演示、可扩展的闭环。评委现在看到的是可跑的第一阶段系统，而不是停留在概念图层面的方案。”
