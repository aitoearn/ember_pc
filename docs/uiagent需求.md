UI agent 是本项目 设备会话  自然语言驱动执行 背后的---VLM驱动的 UI ReAct执行器，移植自（/Users/lisq/lmcloudtest/lmuiagent的ExploreAgent），
一  架构：整体架构 四层，
1，渲染层 ：输入指令/渲染步骤时间轴 ， ui_agent_start(safeInvoke) 和 uiAgent:event:<taskId>(IPC事件桥，复用scrcpy同款)
2，Electron Host ，hostCommands.#startUiAgent -> uiAgent.ts startUiAgent spawn(process.execPath, ELECTRON_RUN_AS_NODE=1,sidecar),读sidecar stdout 每行JSON -> emit( `uiAgent:event:<id>`) , stdin:{task JSON}, stdout:{step JSON}
3，sidecar (scripts/ui-agent/index.mjs),自包含Node ESM, ReAct 循环： a adb screencap 截图  b VLM决策 c 解析坐标  d adb input 执行 e 推事件  f 回到a  
 4，adb 操作手机 和 OpenAI 访问大模型服务。 要点： sidecar 自带adb ,不经 Rust App Server; 步骤回显复用Electron现有的IPC事件桥，所以投屏和agent两条链并行；  
 二： 核心：ReAct循环（observe-> think -> act）sidecar的main()就是一个step循环(默认上限40步，设置配20；)
 1，Observe: adb exec-out screencap -p 抓全屏 PNG->base64，先emit screenshot回显 
 2，Think:把 「系统提示+任务+最近8轮历史（纯文本）+当前截图」发给VLM。VLM被强制输出固定四行：Progress:已经做了什么、上一步是否生效 ； Thought: 简单计划，落到下一步动作 ；Action: 动作空间里的一个动作； Status:true = 整体任务完成，否则false ； 
 3，Parse: 正则拆出 Progress/Thought/Action/Status，再从Action里解析动作名+ 参数+坐标。
 4，Act：动作翻译成adb命令在真机执行
 5，Record+emit：把这一步push进历史（滑动窗口），逐项emit(step_desc/thought/action/result).
 6，终止：finished(...)或Status:true->done(sucess)；达到 maxSteps -> done(fail); 截图/vlm出错 ->error退出。

 