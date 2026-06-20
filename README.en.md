<div align="center"><a name="readme-top"></a>

<img src="./docs/images/feature-start.png" alt="Ember home: start from one testing goal" width="100%" />

# Ember

### Test once, quality in sight

**Open-source AI test workspace for QA teams**

Desktop test design, regression planning, API/E2E validation, knowledge context, multi-model analysis, and device automation workflows.

[简体中文](./README.md) · **English** · [Docs](./docs/README.md) · [Release Notes](./RELEASE_NOTES.en.md) · [Issues](https://github.com/aitoearn/ember_pc/issues)

<p>
  <a href="https://github.com/aitoearn/ember_pc/releases"><img src="https://img.shields.io/github/v/release/aitoearn/ember_pc?label=release" alt="Ember GitHub Release" /></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-246B45" alt="Ember supports macOS and Windows" />
  <img src="https://img.shields.io/badge/desktop-Electron-24C8DB" alt="Ember is an Electron desktop app" />
  <img src="https://img.shields.io/badge/license-GPLv3-2F4F4F" alt="Ember GPLv3 license" />
</p>

Ember keeps requirements, test context, cases, execution notes, and regression review in one place, so quality work becomes a workflow you can continue instead of a one-off chat.

<sub>The Simplified Chinese README is the primary version. This English page is a companion for international readers.</sub>

</div>

---

<details>
<summary><kbd>Table of Contents</kbd></summary>

- [What is Ember?](#what-is-ember)
- [What you can do with Ember](#what-you-can-do-with-ember)
- [Core Capabilities](#core-capabilities)
- [Real QA workflows](#real-qa-workflows)
- [A simple workflow](#a-simple-workflow)
- [Who Ember is for](#who-ember-is-for)
- [If you are searching for these tools](#if-you-are-searching-for-these-tools)
- [Who Ember is not for](#who-ember-is-not-for)
- [Quick Start](#quick-start)
- [Tech Stack and Platforms](#tech-stack-and-platforms)
- [FAQ](#faq)
- [License](#license)
- [Disclaimer](#disclaimer)

</details>

---

## What is Ember?

Ember is an open-source Electron desktop AI workspace for QA engineers, SDETs, release managers, and small quality teams. It brings test design, regression planning, API validation, E2E planning, performance and security testing, test context management, and multi-model workflows into one local desktop product.

Think of Ember as an AI workspace for long-running quality work:

- Not just one prompt and one answer, but a project or release that can keep moving forward.
- Not repeatedly collecting PRDs, API docs, and old cases, but saving test context and repeatable methods.
- Not leaving conclusions scattered across chat history, but keeping useful cases and checklists for the next round.
- Not locking you into one AI service, but letting you use the providers and models you already configure.

If you often switch between requirements docs, API platforms, bug trackers, automation scripts, and model dashboards, Ember is designed to bring those steps back into one test space.

---

## What you can do with Ember

- **Start from one testing goal**: describe reports, regression scope, case design, or specialized plans in natural language with quick-entry shortcuts.
- **Manage cases and generate with AI**: organize modules and cases structurally, then draft from requirements or acceptance criteria and add them to the library.
- **Build project knowledge**: curate PRDs, API notes, code snippets, and test reviews so later tasks can reuse confirmed context.
- **Use the Expert Plaza and Skills**: pick expert agents for strategy, case design, automation, performance, security, and more.
- **Manage devices and run mobile automation**: connect Android devices, then open the workbench for UI automation, Monkey, performance monitoring, and packet capture.
- **Run mobile UI automation**: combine live device mirroring with natural-language steps so the agent follows a ReAct loop of screenshot, reasoning, and action.
- **Bring your own AI models**: configure OpenAI-compatible providers, API hosts, keys, and primary models locally.

---

## Core Capabilities

### Start from one test task

<img src="./docs/images/feature-start.png" alt="Home screen with testing goal input and quick-entry chips" width="100%" />

The home surface is organized around the current project. Enter goals such as "help me write a test report" or "scope regression for this release," then jump into guidance, case writing, requirement-to-case, scenario coverage, and related workflows.

### Test case management and AI generation

<img src="./docs/images/test-case-ai.png" alt="Test case management with AI draft generation modal" width="100%" />

Manage cases by module with search, IDs, and tags. When you need a fast draft, paste requirements or upload `.md` / `.txt` / `.json` material, choose a model, generate drafts, and add them to the library.

### Project knowledge and test context

<img src="./docs/images/feature-workspace.png" alt="Project materials page for confirmed test context" width="100%" />

Organize PRDs, API docs, code snippets, and test reviews as project materials. After confirmation, mark what is available for testing or recommended for the current round so agents do not start from empty context.

### Expert Plaza

<img src="./docs/images/experts-plaza.png" alt="Expert Plaza with strategy, design, automation, and security experts" width="100%" />

Browse expert agents by strategy, case design, automation, performance, security, and quality analysis. Add frequently used experts to a project and start from those entry points instead of rewriting prompts every time.

### Device management

<img src="./docs/images/device-management.png" alt="Device management list with online Android devices" width="100%" />

See connected device model, OS version, resolution, and online status in one place, then enter the mobile workbench for AI case generation, UI automation, Monkey, performance monitoring, startup timing, and packet capture.

### Mobile UI automation

<img src="./docs/images/regression-review.png" alt="Mobile workbench with device mirror and natural-language UI automation" width="100%" />

The left panel shows the live device screen; the right panel accepts natural-language steps and assertions. Supports UI-tree, vision, and hybrid perception modes plus free/strict execution for login flows, settings checks, kill-and-restart scenarios, and more.

### Use your own AI services

<img src="./docs/images/feature-provider.png" alt="AI provider settings for API host, key, and model priority" width="100%" />

Ember does not provide model services itself. Configure OpenAI-compatible providers, API hosts, keys, and primary models in settings, fetch or manually add model lists, and test the connection before running tasks.

---

## Real QA workflows

### 1. Before release: large change set, unclear regression scope

A release touches login, order, and payment flows. You know regression is needed, but it is hard to decide what must be fully covered versus sampled.

With Ember, you can put release notes, core paths, and known risks into one task, let AI draft regression scope and priorities, then keep refining: which scenarios must run in full? which need environment prep?

What remains is not just one answer, but a test trail from scope to execution checklist.

### 2. API testing: docs exist, cases and assertions do not

OpenAPI or contract docs are ready, but happy paths, auth failures, boundary values, and error responses are not yet structured.

In Ember, you can feed contracts and focus scenarios into a task, or use AI case generation to draft from requirements and persist them into the current project's test context.

### 3. Mobile regression: device in hand, script maintenance too slow

The same feature must be validated repeatedly on Android hardware, but traditional automation scripts take too long to build for short-notice regression.

Ember's device workbench shows the live screen and accepts natural-language steps and assertions, with agents using UI-tree or vision perception for exploratory checks and regression spot tests.

### 4. Defect review: many issues, little structured analysis

A release accumulates defects and the team needs module distribution, recurrence risk, and root-cause patterns, but lacks time for systematic review.

With Ember, you can import defect summaries or test records, classify and analyze them, then turn the output into the next testing strategy and observation metrics.

### 5. Small teams: testing know-how lives in individuals

Some people are strong at API testing, others at E2E or performance. The problem is that this experience rarely becomes reusable team entry points.

Ember can turn stable testing practices into experts, Skills, and app entries so the next regression plan or API review does not start from a blank prompt.

---

## A simple workflow

1. Create a task, such as "Scope regression for v2.3 release candidate"
2. Organize and confirm PRDs, API notes, or defect history in project materials first
3. Configure and test your model in AI provider settings
4. Start from the home goal input, or open test cases, Expert Plaza, or mobile testing
5. Keep refining assertions, steps, or on-device validation in the same task
6. Save useful outputs into project knowledge or the case library for the next round

In short: bring test context in first, let AI help you move forward, then keep what is useful.

---

## Who Ember is for

- QA engineers, SDETs, quality leads, and release managers
- Teams maintaining regression lists, API cases, E2E plans, or mobile validation
- People who regularly organize PRDs, API docs, defects, and test reports
- Teams that want to save personal methods, team templates, and project context
- People already using AI models who want a more stable testing workspace

---

## If you are searching for these tools

Ember may fit searches like: AI test workspace, desktop QA tool, test case design, regression planning, API testing assistant, knowledge base for testing, multi-model workflow, mobile UI automation, Android device testing, E2E testing, performance testing, security testing.

---

## Who Ember is not for

- People who only want a quick web chat and do not want project or test context management
- People who refuse to configure any AI provider or API key
- People expecting a tool that automatically runs all tests and owns quality outcomes

Ember works best when AI is a testing collaborator: you provide scope, context, and judgment; it helps organize, generate, analyze, and review.

---

## Quick Start

### Download

Download the installer for your platform from GitHub Releases:

https://github.com/aitoearn/ember_pc/releases

- macOS: `.dmg` installer
- Windows: `Ember_*_x64-setup.exe` installer
- macOS and Windows only; Linux desktop builds are paused
- Windows SmartScreen warnings may appear for unsigned or low-reputation installers

### First run

1. Open Ember
2. Go to **AI provider settings**, add your API key, and test the model
3. Organize and confirm project materials for this round
4. Create a test task from home, or open **test cases**, **experts**, or **mobile testing**
5. Add a PRD, API note, or testing goal and start generating cases, regression lists, or device validation

---

## Tech Stack and Platforms

- Desktop: Electron, Rust App Server
- Frontend: React, TypeScript, Vite
- Device automation: ADB, scrcpy, UI-agent perception, and device mirroring
- Platforms: macOS, Windows
- License: GPLv3

---

## FAQ

### Does Ember provide AI models?

No. Ember is a testing workspace, not a model provider. Configure your own provider and API key in **AI provider settings**.

### Will all my test data be uploaded?

Ember prefers to keep project knowledge, session history, and settings on your machine. When you call AI generation, relevant input is sent to your configured provider. Handle sensitive data according to provider policy.

### How is this different from a normal chat tool?

Chat tools optimize for one-shot Q&A. Ember optimizes for long-running quality work: project knowledge can be confirmed and reused, cases can be managed structurally, devices can be connected for validation, and experts or Skills can be called repeatedly.

### Do I need to be good at prompt engineering?

No. Start from home quick entries, Expert Plaza, project materials, or AI case generation, then let agents iterate on confirmed context.

### What do I need for mobile testing?

A working local ADB setup and a connected Android device or emulator. After connection, check status in device management, then open the workbench for mirroring and UI automation.

---

## License

[GNU General Public License v3 (GPLv3)](https://www.gnu.org/licenses/gpl-3.0)

## Disclaimer

This project is for learning and research. Users assume their own risk.
Ember does not provide AI model services; model capabilities come from third-party providers.

---

<div align="center">



</div>
