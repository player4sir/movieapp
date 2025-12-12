# Implementation Plan

- [x] 1. 升级核心依赖





  - [x] 1.1 更新 Next.js 到 15.x 版本


    - 修改 package.json 中 next 版本为 "^15.0.0"
    - 更新 eslint-config-next 为 "^15.0.0"
    - _Requirements: 1.1, 4.1_

  - [x] 1.2 更新 React 相关依赖

    - 更新 react 和 react-dom 到 "^19.0.0" 或保持 "^18"
    - 更新 @types/react 和 @types/react-dom 到对应版本
    - _Requirements: 1.2, 4.2_
  - [x] 1.3 安装依赖并解决冲突


    - 运行 npm install
    - 解决可能的 peer dependency 冲突
    - _Requirements: 4.3_

- [x] 2. 替换 PWA 插件





  - [x] 2.1 安装新的 PWA 插件


    - 卸载 next-pwa: `npm uninstall next-pwa`
    - 安装 @ducanh2912/next-pwa: `npm install @ducanh2912/next-pwa`
    - _Requirements: 2.1_
  - [x] 2.2 更新 next.config.mjs 中的 PWA 配置


    - 更新 import 语句
    - 保持现有的 runtimeCaching 配置
    - 验证配置格式兼容性
    - _Requirements: 2.2, 2.3_
  - [ ]* 2.3 编写属性测试验证 PWA 缓存策略保留
    - **Property 3: PWA Cache Strategy Preservation**
    - **Validates: Requirements 2.2**

- [x] 3. 更新动态路由参数处理






  - [x] 3.1 更新 src/app/api/user/coins/orders/[id]/route.ts

    - 将 params 类型改为 `Promise<{ id: string }>`
    - 添加 await 获取 params
    - _Requirements: 3.1, 3.4_


  - [x] 3.2 更新 src/app/api/admin/coins/orders/[id]/route.ts

    - 将 params 类型改为 `Promise<{ id: string }>`
    - 添加 await 获取 params

    - _Requirements: 3.1, 3.4_
  - [x] 3.3 检查并更新其他动态路由文件

    - 检查所有 [id]、[position]、[vodId] 等动态路由
    - 确保所有 params 使用 Promise 类型
    - _Requirements: 3.1, 3.4_
  - [ ]* 3.4 编写属性测试验证动态路由参数处理
    - **Property 2: Dynamic Route Parameter Handling**
    - **Validates: Requirements 3.1, 3.4**

- [ ] 4. Checkpoint - 确保构建成功
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. 验证和测试






  - [x] 5.1 运行构建验证

    - 执行 npm run build
    - 确认无编译错误
    - 检查 public/sw.js 生成
    - _Requirements: 1.3, 2.3_
  - [x] 5.2 运行现有测试套件


    - 执行 npm test
    - 修复因升级导致的测试失败
    - _Requirements: 5.5_
  - [ ]* 5.3 编写属性测试验证构建一致性
    - **Property 1: Build Success Consistency**
    - **Validates: Requirements 1.3**
  - [ ]* 5.4 编写属性测试验证测试套件兼容性
    - **Property 4: Test Suite Compatibility**
    - **Validates: Requirements 5.5**

- [ ] 6. Final Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.
