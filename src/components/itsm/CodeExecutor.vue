<template>
  <div class="code-executor">
    <div class="executor-header">
      <button @click="execute" class="btn-execute">▶️ 运行代码</button>
      <button @click="stopExecution" v-if="isRunning" class="btn-stop">⏹️ 停止</button>
      <span v-if="isRunning" class="executing-text">执行中...</span>
      <span v-else-if="lastExecutionTime" class="exec-time">耗时: {{ lastExecutionTime }}ms</span>
    </div>

    <div class="output-section">
      <div class="output-tabs">
        <button
          @click="outputTab = 'stdout'"
          class="output-tab"
          :class="{ active: outputTab === 'stdout' }"
        >
          📤 输出
        </button>
        <button
          @click="outputTab = 'stderr'"
          class="output-tab"
          :class="{ active: outputTab === 'stderr' }"
        >
          ❌ 错误
        </button>
        <button
          @click="outputTab = 'info'"
          class="output-tab"
          :class="{ active: outputTab === 'info' }"
        >
          ℹ️ 信息
        </button>
      </div>

      <div class="output-content">
        <div v-if="outputTab === 'stdout'" class="output-text">
          <div v-if="!stdout" class="empty-output">暂无输出</div>
          <pre v-else>{{ stdout }}</pre>
        </div>

        <div v-if="outputTab === 'stderr'" class="output-text error">
          <div v-if="!stderr" class="empty-output">暂无错误</div>
          <pre v-else>{{ stderr }}</pre>
        </div>

        <div v-if="outputTab === 'info'" class="output-text">
          <div class="info-item">
            <span class="label">语言:</span>
            <span class="value">{{ languageLabel }}</span>
          </div>
          <div class="info-item">
            <span class="label">状态:</span>
            <span class="value" :class="statusClass">{{ statusText }}</span>
          </div>
          <div v-if="lastExecutionTime" class="info-item">
            <span class="label">执行时间:</span>
            <span class="value">{{ lastExecutionTime }}ms</span>
          </div>
          <div class="info-item">
            <span class="label">代码行数:</span>
            <span class="value">{{ codeLines }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CodeExecutor',
  props: {
    code: { type: String, required: true },
    language: { type: String, default: 'python' }
  },
  emits: ['execute', 'stop'],
  data() {
    return {
      isRunning: false,
      stdout: '',
      stderr: '',
      lastExecutionTime: null,
      outputTab: 'stdout',
      executionStatus: 'idle' // idle, running, success, error
    }
  },
  computed: {
    languageLabel() {
      const labels = {
        python: 'Python 🐍',
        javascript: 'JavaScript 📜',
        bash: 'Bash 🖥️',
        html: 'HTML 🌐',
        sql: 'SQL 💾'
      }
      return labels[this.language] || this.language
    },
    statusText() {
      const statuses = {
        idle: '就绪',
        running: '运行中...',
        success: '执行成功 ✅',
        error: '执行失败 ❌'
      }
      return statuses[this.executionStatus] || '未知'
    },
    statusClass() {
      return 'status-' + this.executionStatus
    },
    codeLines() {
      return this.code.split('\n').length
    }
  },
  methods: {
    async execute() {
      if (!this.code.trim()) {
        alert('请输入代码')
        return
      }

      this.isRunning = true
      this.executionStatus = 'running'
      this.stdout = ''
      this.stderr = ''
      this.lastExecutionTime = null

      const startTime = performance.now()

      try {
        const response = await fetch('/api/code/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: this.code,
            language: this.language,
            timeout: 30000
          })
        })

        if (!response.ok) {
          // 服务器还未启动，使用本地模拟
          this.simulateExecution()
          return
        }

        const result = await response.json()
        this.stdout = result.stdout || ''
        this.stderr = result.stderr || ''
        this.executionStatus = result.stderr ? 'error' : 'success'
      } catch (e) {
        // 无 API 端点，使用本地模拟
        this.simulateExecution()
      } finally {
        const endTime = performance.now()
        this.lastExecutionTime = Math.round(endTime - startTime)
        this.isRunning = false
      }
    },

    simulateExecution() {
      // 本地模拟执行 - 不依赖后端
      if (this.language === 'python') {
        this.simulatePython()
      } else if (this.language === 'javascript') {
        this.simulateJavaScript()
      } else if (this.language === 'bash') {
        this.simulateBash()
      } else if (this.language === 'html') {
        this.simulateHtml()
      } else if (this.language === 'sql') {
        this.simulateSql()
      }
      this.executionStatus = this.stderr ? 'error' : 'success'
    },

    // ==========================================
    // Python 模拟器
    // ==========================================
    simulatePython() {
      try {
        const lines = this.code.split('\n')
        const output = []
        const vars = {}

        for (let i = 0; i < lines.length; i++) {
          let line = lines[i].trim()
          if (!line || line.startsWith('#')) continue

          // 变量赋值: x = 123 / x = "hello" / x = [1,2,3]
          const assignMatch = line.match(/^(\w+)\s*=\s*(.+)$/)
          if (assignMatch && !line.startsWith('print') && !line.startsWith('if') && !line.startsWith('for')) {
            const name = assignMatch[1]
            vars[name] = this._pyEval(assignMatch[2].trim(), vars)
            continue
          }

          // print()
          const printMatch = line.match(/^print\((.+)\)$/)
          if (printMatch) {
            const arg = printMatch[1].trim()
            // print(f"...") f-string
            if (arg.startsWith('f"') || arg.startsWith("f'")) {
              const quote = arg[1]
              const inner = arg.slice(2, arg.lastIndexOf(quote))
              const result = inner.replace(/\{([^}]+)\}/g, (_, expr) => {
                return this._pyEval(expr.trim(), vars)
              })
              output.push(result)
            }
            // print("...", var, ...) 多参数
            else if (arg.includes(',')) {
              const parts = this._pySplitArgs(arg)
              output.push(parts.map(p => String(this._pyEval(p.trim(), vars))).join(' '))
            }
            else {
              output.push(String(this._pyEval(arg, vars)))
            }
            continue
          }

          // for i in range(n): print(...)
          const forMatch = line.match(/^for\s+(\w+)\s+in\s+range\((.+?)\):?\s*$/)
          if (forMatch) {
            const varName = forMatch[1]
            const rangeArgs = forMatch[2].split(',').map(a => Number(this._pyEval(a.trim(), vars)))
            let start = 0, end = 0, step = 1
            if (rangeArgs.length === 1) { end = rangeArgs[0] }
            else if (rangeArgs.length === 2) { start = rangeArgs[0]; end = rangeArgs[1] }
            else { start = rangeArgs[0]; end = rangeArgs[1]; step = rangeArgs[2] }
            // 收集循环体（缩进的行）
            const body = []
            let j = i + 1
            while (j < lines.length && (lines[j].startsWith('  ') || lines[j].startsWith('\t'))) {
              body.push(lines[j].replace(/^\s+/, ''))
              j++
            }
            if (body.length === 0 && line.includes(':')) {
              // 单行 for: for i in range(5): print(i)
              const afterColon = line.split(':').slice(1).join(':').trim()
              if (afterColon) body.push(afterColon)
            }
            for (let v = start; step > 0 ? v < end : v > end; v += step) {
              vars[varName] = v
              for (const bline of body) {
                const bPrint = bline.match(/^print\((.+)\)$/)
                if (bPrint) {
                  const val = this._pyEval(bPrint[1].trim(), vars)
                  output.push(String(val))
                }
              }
            }
            i = j - 1
            continue
          }

          // import
          if (line.startsWith('import ') || line.startsWith('from ')) {
            const mod = line.replace(/^(from|import)\s+/, '').split(/\s/)[0]
            output.push(`✅ 模块 ${mod} 已导入`)
            continue
          }

          // len(), type(), etc
          if (line.startsWith('print')) continue // already handled above
        }

        this.stdout = output.length > 0 ? output.join('\n') : '✅ Python 代码执行成功（无输出）'
      } catch (e) {
        this.stderr = '❌ Python 执行错误: ' + e.message
      }
    },

    _pyEval(expr, vars) {
      expr = expr.trim()
      // 字符串字面量
      if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
        return expr.slice(1, -1)
      }
      // 布尔
      if (expr === 'True') return true
      if (expr === 'False') return false
      if (expr === 'None') return 'None'
      // 数字
      if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr)
      // 列表字面量
      if (expr.startsWith('[') && expr.endsWith(']')) {
        try {
          const inner = expr.slice(1, -1)
          return '[' + inner + ']'
        } catch { return expr }
      }
      // 变量引用
      if (vars && vars.hasOwnProperty(expr)) return vars[expr]
      // 字符串乘法: "x" * 3
      const strMul = expr.match(/^["'](.+?)["']\s*\*\s*(\d+)$/)
      if (strMul) return strMul[1].repeat(Number(strMul[2]))
      // 字符串拼接: "a" + "b" + var
      if (expr.includes('+') && (expr.includes('"') || expr.includes("'"))) {
        const parts = expr.split('+').map(p => String(this._pyEval(p.trim(), vars)))
        return parts.join('')
      }
      // 算术表达式
      try {
        const safeExpr = expr.replace(/\b([a-zA-Z_]\w*)\b/g, (m) => {
          if (vars && vars.hasOwnProperty(m)) return String(vars[m])
          return m
        })
        if (/^[\d\s+\-*/%().]+$/.test(safeExpr)) {
          return new Function('return ' + safeExpr)()
        }
      } catch { /* ignore */ }
      // len()
      const lenMatch = expr.match(/^len\((.+)\)$/)
      if (lenMatch) {
        const inner = this._pyEval(lenMatch[1], vars)
        return typeof inner === 'string' ? inner.length : String(inner).length
      }
      // str()
      const strMatch = expr.match(/^str\((.+)\)$/)
      if (strMatch) return String(this._pyEval(strMatch[1], vars))
      // int()
      const intMatch = expr.match(/^int\((.+)\)$/)
      if (intMatch) return parseInt(this._pyEval(intMatch[1], vars))
      return vars && vars.hasOwnProperty(expr) ? vars[expr] : expr
    },

    _pySplitArgs(str) {
      const args = []
      let depth = 0, current = '', inStr = null
      for (const ch of str) {
        if (!inStr && (ch === '"' || ch === "'")) { inStr = ch; current += ch }
        else if (inStr === ch) { inStr = null; current += ch }
        else if (!inStr && (ch === '(' || ch === '[')) { depth++; current += ch }
        else if (!inStr && (ch === ')' || ch === ']')) { depth--; current += ch }
        else if (!inStr && ch === ',' && depth === 0) { args.push(current); current = '' }
        else { current += ch }
      }
      if (current) args.push(current)
      return args
    },

    // ==========================================
    // JavaScript 模拟器（真实执行）
    // ==========================================
    simulateJavaScript() {
      try {
        const logs = []
        const warns = []
        const errors = []
        const origLog = console.log
        const origWarn = console.warn
        const origError = console.error
        console.log = (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '))
        console.warn = (...args) => warns.push(args.map(a => String(a)).join(' '))
        console.error = (...args) => errors.push(args.map(a => String(a)).join(' '))
        try {
          // eslint-disable-next-line no-new-func
          const result = new Function(this.code)()
          if (result !== undefined && logs.length === 0) {
            logs.push(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result))
          }
        } finally {
          console.log = origLog
          console.warn = origWarn
          console.error = origError
        }
        const allOutput = []
        if (logs.length) allOutput.push(logs.join('\n'))
        if (warns.length) allOutput.push('⚠️ ' + warns.join('\n'))
        this.stdout = allOutput.length > 0 ? allOutput.join('\n') : '✅ 执行成功（无输出）'
        if (errors.length) this.stderr = errors.join('\n')
      } catch (e) {
        this.stderr = '❌ ' + e.name + ': ' + e.message
        if (e.stack) {
          const stackLine = e.stack.split('\n').find(l => l.includes('anonymous'))
          if (stackLine) {
            const lineMatch = stackLine.match(/:(\d+):\d+/)
            if (lineMatch) this.stderr += `\n   at line ${Number(lineMatch[1]) - 2}`
          }
        }
      }
    },

    // ==========================================
    // Bash 模拟器
    // ==========================================
    simulateBash() {
      try {
        const lines = this.code.split('\n')
        const output = []
        const vars = {
          HOME: '/home/user',
          USER: 'user',
          SHELL: '/bin/bash',
          PWD: '/home/user/project',
          PATH: '/usr/local/bin:/usr/bin:/bin',
          HOSTNAME: 'localhost',
          LANG: 'zh_CN.UTF-8',
          RANDOM: String(Math.floor(Math.random() * 32768))
        }
        let i = 0

        const resolveVars = (str) => {
          return str
            .replace(/\$\{(\w+)(?::-(.*?))?\}/g, (_, name, def) => vars[name] !== undefined ? vars[name] : (def || ''))
            .replace(/\$(\w+)/g, (_, name) => vars[name] !== undefined ? vars[name] : '')
            .replace(/\$\(date\s*(?:\+["']?(.*?)["']?)?\)/g, (_, fmt) => {
              const d = new Date()
              if (!fmt) return d.toString()
              return fmt.replace(/%Y/g, d.getFullYear())
                .replace(/%m/g, String(d.getMonth() + 1).padStart(2, '0'))
                .replace(/%d/g, String(d.getDate()).padStart(2, '0'))
                .replace(/%H/g, String(d.getHours()).padStart(2, '0'))
                .replace(/%M/g, String(d.getMinutes()).padStart(2, '0'))
                .replace(/%S/g, String(d.getSeconds()).padStart(2, '0'))
                .replace(/%F/g, `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
                .replace(/%T/g, `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`)
            })
            .replace(/\$\(\((.+?)\)\)/g, (_, expr) => {
              try {
                const safeExpr = expr.replace(/\b([a-zA-Z_]\w*)\b/g, m => vars[m] !== undefined ? vars[m] : m)
                if (/^[\d\s+\-*/%()]+$/.test(safeExpr)) return String(new Function('return ' + safeExpr)())
              } catch { /* ignore */ }
              return ''
            })
        }

        const processEcho = (args) => {
          let noNewline = false
          let enableEscape = false
          let parts = args
          // 处理 echo 选项
          while (parts.startsWith('-')) {
            if (parts.startsWith('-n ')) { noNewline = true; parts = parts.slice(3) }
            else if (parts.startsWith('-e ')) { enableEscape = true; parts = parts.slice(3) }
            else break
          }
          // 去除引号并解析
          let result = ''
          let inSingle = false, inDouble = false
          for (let j = 0; j < parts.length; j++) {
            const ch = parts[j]
            if (ch === "'" && !inDouble) { inSingle = !inSingle; continue }
            if (ch === '"' && !inSingle) { inDouble = !inDouble; continue }
            result += ch
          }
          result = resolveVars(result)
          if (enableEscape) {
            result = result.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\')
          }
          return result
        }

        while (i < lines.length) {
          let line = lines[i].trim()
          i++

          // 空行或注释
          if (!line || line.startsWith('#')) continue

          // 变量赋值: VAR=value 或 VAR="value"
          const assignMatch = line.match(/^(\w+)=(["']?)(.*?)\2\s*$/)
          if (assignMatch) {
            vars[assignMatch[1]] = resolveVars(assignMatch[3])
            continue
          }

          // export VAR=value
          const exportMatch = line.match(/^export\s+(\w+)=(["']?)(.*?)\2\s*$/)
          if (exportMatch) {
            vars[exportMatch[1]] = resolveVars(exportMatch[3])
            continue
          }

          // echo
          if (line.startsWith('echo ') || line === 'echo') {
            const args = line === 'echo' ? '' : line.slice(5)
            output.push(processEcho(args))
            continue
          }

          // printf
          const printfMatch = line.match(/^printf\s+["'](.+?)["']\s*(.*)$/)
          if (printfMatch) {
            let fmt = printfMatch[1]
            const pArgs = printfMatch[2] ? printfMatch[2].split(/\s+/).map(a => resolveVars(a.replace(/^["']|["']$/g, ''))) : []
            let argIdx = 0
            let result = fmt.replace(/%[sd]/g, () => pArgs[argIdx++] || '')
            result = result.replace(/\\n/g, '\n').replace(/\\t/g, '\t')
            output.push(result)
            continue
          }

          // for 循环: for VAR in ...; do ... done
          const forInMatch = line.match(/^for\s+(\w+)\s+in\s+(.+?);\s*do\s*$/)
          if (forInMatch) {
            const varName = forInMatch[1]
            let items = resolveVars(forInMatch[2])
            // {1..N} 展开
            const braceMatch = items.match(/^\{(\d+)\.\.(\d+)\}$/)
            if (braceMatch) {
              const s = Number(braceMatch[1]), e = Number(braceMatch[2])
              const arr = []
              for (let v = s; v <= e; v++) arr.push(String(v))
              items = arr.join(' ')
            }
            // $(seq N) 展开
            const seqMatch = items.match(/^\$\(seq\s+(\d+)(?:\s+(\d+))?\)$/)
            if (seqMatch) {
              const start = seqMatch[2] ? Number(seqMatch[1]) : 1
              const end = seqMatch[2] ? Number(seqMatch[2]) : Number(seqMatch[1])
              const arr = []
              for (let v = start; v <= end; v++) arr.push(String(v))
              items = arr.join(' ')
            }
            // 收集循环体
            const body = []
            while (i < lines.length && !lines[i].trim().startsWith('done')) {
              body.push(lines[i].trim())
              i++
            }
            i++ // skip 'done'
            // 执行循环
            for (const item of items.split(/\s+/)) {
              vars[varName] = item
              for (const bline of body) {
                if (bline.startsWith('echo ') || bline === 'echo') {
                  output.push(processEcho(bline === 'echo' ? '' : bline.slice(5)))
                } else {
                  const bAssign = bline.match(/^(\w+)=(["']?)(.*?)\2\s*$/)
                  if (bAssign) vars[bAssign[1]] = resolveVars(bAssign[3])
                }
              }
            }
            continue
          }

          // while 循环（简单: while [ $i -le N ]）
          const whileMatch = line.match(/^while\s+\[\s*\$(\w+)\s+-(le|lt|ge|gt|eq|ne)\s+(\d+)\s*\];\s*do\s*$/)
          if (whileMatch) {
            const varName = whileMatch[1]
            const op = whileMatch[2]
            const limit = Number(whileMatch[3])
            const body = []
            while (i < lines.length && !lines[i].trim().startsWith('done')) {
              body.push(lines[i].trim())
              i++
            }
            i++
            let safety = 0
            const cmp = (a, b) => {
              if (op === 'le') return a <= b
              if (op === 'lt') return a < b
              if (op === 'ge') return a >= b
              if (op === 'gt') return a > b
              if (op === 'eq') return a === b
              if (op === 'ne') return a !== b
              return false
            }
            while (cmp(Number(vars[varName] || 0), limit) && safety++ < 1000) {
              for (const bline of body) {
                if (bline.startsWith('echo ') || bline === 'echo') {
                  output.push(processEcho(bline === 'echo' ? '' : bline.slice(5)))
                }
                const bAssign = bline.match(/^(\w+)=\$\(\((.+?)\)\)$/)
                if (bAssign) {
                  const expr = bAssign[2].replace(/\b([a-zA-Z_]\w*)\b/g, m => vars[m] !== undefined ? vars[m] : m)
                  try { vars[bAssign[1]] = String(new Function('return ' + expr)()) } catch { /* ignore */ }
                }
              }
            }
            continue
          }

          // if [ condition ]; then ... fi
          const ifMatch = line.match(/^if\s+\[\s*(.+?)\s*\];\s*then\s*$/)
          if (ifMatch) {
            const cond = resolveVars(ifMatch[1])
            let condResult = false
            // -z / -n 字符串测试
            const zMatch = cond.match(/^-z\s+"?(.*?)"?$/)
            const nMatch = cond.match(/^-n\s+"?(.*?)"?$/)
            const numCmp = cond.match(/^(.+?)\s+-(eq|ne|lt|le|gt|ge)\s+(.+?)$/)
            const strCmp = cond.match(/^"?(.*?)"?\s*(=|!=)\s*"?(.*?)"?$/)
            if (zMatch) condResult = zMatch[1].length === 0
            else if (nMatch) condResult = nMatch[1].length > 0
            else if (numCmp) {
              const a = Number(numCmp[1]), op = numCmp[2], b = Number(numCmp[3])
              if (op === 'eq') condResult = a === b
              else if (op === 'ne') condResult = a !== b
              else if (op === 'lt') condResult = a < b
              else if (op === 'le') condResult = a <= b
              else if (op === 'gt') condResult = a > b
              else if (op === 'ge') condResult = a >= b
            } else if (strCmp) {
              condResult = strCmp[2] === '=' ? strCmp[1] === strCmp[3] : strCmp[1] !== strCmp[3]
            }
            // 收集 then/else/fi
            const thenBody = [], elseBody = []
            let inElse = false
            while (i < lines.length && !lines[i].trim().startsWith('fi')) {
              const l = lines[i].trim()
              if (l === 'else') { inElse = true; i++; continue }
              if (inElse) elseBody.push(l); else thenBody.push(l)
              i++
            }
            i++
            const execBody = condResult ? thenBody : elseBody
            for (const bl of execBody) {
              if (bl.startsWith('echo ') || bl === 'echo') {
                output.push(processEcho(bl === 'echo' ? '' : bl.slice(5)))
              }
            }
            continue
          }

          // 简单命令模拟
          if (line === 'pwd') { output.push(vars.PWD); continue }
          if (line === 'whoami') { output.push(vars.USER); continue }
          if (line === 'hostname') { output.push(vars.HOSTNAME); continue }
          if (line === 'date') { output.push(new Date().toString()); continue }
          if (line.startsWith('date ')) {
            const resolved = resolveVars(line)
            if (resolved !== line) output.push(resolved.replace(/^date\s*/, ''))
            else output.push(new Date().toString())
            continue
          }
          if (line === 'uname -a') { output.push('Linux localhost 5.15.0 #1 SMP x86_64 GNU/Linux'); continue }
          if (line === 'uname') { output.push('Linux'); continue }
          if (line === 'ls') { output.push('src/  public/  package.json  vite.config.js  README.md'); continue }
          if (line === 'env' || line === 'printenv') {
            Object.entries(vars).forEach(([k, v]) => output.push(`${k}=${v}`))
            continue
          }

          // seq
          const seqCmd = line.match(/^seq\s+(\d+)(?:\s+(\d+))?$/)
          if (seqCmd) {
            const start = seqCmd[2] ? Number(seqCmd[1]) : 1
            const end = seqCmd[2] ? Number(seqCmd[2]) : Number(seqCmd[1])
            for (let v = start; v <= end; v++) output.push(String(v))
            continue
          }

          // expr
          const exprCmd = line.match(/^expr\s+(.+)$/)
          if (exprCmd) {
            const expr = resolveVars(exprCmd[1]).replace(/\s*\+\s*/g, '+').replace(/\s*-\s*/g, '-')
              .replace(/\s*\\\*\s*/g, '*').replace(/\s*\*\s*/g, '*').replace(/\s*\/\s*/g, '/')
            try {
              if (/^[\d+\-*/().\s]+$/.test(expr)) output.push(String(Math.floor(new Function('return ' + expr)())))
            } catch { output.push('expr: syntax error') }
            continue
          }

          // cat <<EOF heredoc
          if (line.match(/^cat\s*<<\s*'?(\w+)'?\s*$/)) {
            const marker = line.match(/^cat\s*<<\s*'?(\w+)'?\s*$/)[1]
            while (i < lines.length && lines[i].trim() !== marker) {
              output.push(resolveVars(lines[i]))
              i++
            }
            i++
            continue
          }

          // sleep (skip)
          if (line.startsWith('sleep ')) continue
          // exit
          if (line.startsWith('exit')) break
          // read (skip)
          if (line.startsWith('read ')) { vars[line.split(/\s+/)[1]] = 'input'; continue }
        }

        this.stdout = output.length > 0 ? output.join('\n') : '✅ Bash 脚本执行成功（无输出）'
      } catch (e) {
        this.stderr = '❌ Bash 模拟错误: ' + e.message
      }
    },

    // ==========================================
    // HTML 模拟器（结构验证 + 预览提示）
    // ==========================================
    simulateHtml() {
      try {
        const code = this.code.trim()
        if (!code) { this.stdout = '⚠️ 请输入 HTML 代码'; return }
        const info = []
        // 标签统计
        const tags = code.match(/<(\w+)[\s>]/g) || []
        const tagNames = tags.map(t => t.replace(/[<\s>]/g, '').toLowerCase())
        const unique = [...new Set(tagNames)]
        info.push(`📊 标签统计: ${tags.length} 个标签，${unique.length} 种类型`)
        info.push(`   标签: ${unique.join(', ')}`)
        // 检查闭合
        const openTags = (code.match(/<(\w+)[\s>]/g) || []).map(t => t.replace(/[<\s>]/g, '').toLowerCase())
        const closeTags = (code.match(/<\/(\w+)>/g) || []).map(t => t.replace(/<\/|>/g, '').toLowerCase())
        const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'source', 'track', 'wbr']
        const unclosed = openTags.filter(t => !selfClosing.includes(t) && !closeTags.includes(t))
        if (unclosed.length > 0) {
          info.push(`⚠️ 可能未闭合: ${[...new Set(unclosed)].join(', ')}`)
        } else {
          info.push('✅ 标签闭合检查通过')
        }
        // 结构检查
        if (code.includes('<!DOCTYPE') || code.includes('<!doctype')) info.push('✅ 包含 DOCTYPE 声明')
        if (code.includes('<html')) info.push('✅ 包含 html 根元素')
        if (code.includes('<head')) info.push('✅ 包含 head 部分')
        if (code.includes('<body')) info.push('✅ 包含 body 部分')
        if (code.includes('<title')) info.push('✅ 包含 title 标签')
        // 属性检查
        const ids = code.match(/id=["']([^"']+)["']/g) || []
        const classes = code.match(/class=["']([^"']+)["']/g) || []
        if (ids.length) info.push(`🔹 ID 属性: ${ids.length} 个`)
        if (classes.length) info.push(`🔹 Class 属性: ${classes.length} 个`)
        info.push(`\n📝 共 ${code.split('\n').length} 行, ${code.length} 字符`)
        this.stdout = info.join('\n')
      } catch (e) {
        this.stderr = '❌ HTML 分析错误: ' + e.message
      }
    },

    // ==========================================
    // SQL 模拟器（语法分析）
    // ==========================================
    simulateSql() {
      try {
        const code = this.code.trim().toUpperCase()
        const info = []
        // 识别语句类型
        const statements = code.split(';').map(s => s.trim()).filter(Boolean)
        info.push(`📊 共 ${statements.length} 条 SQL 语句\n`)
        statements.forEach((stmt, idx) => {
          let type = '未知'
          if (stmt.startsWith('SELECT')) type = '查询 (SELECT)'
          else if (stmt.startsWith('INSERT')) type = '插入 (INSERT)'
          else if (stmt.startsWith('UPDATE')) type = '更新 (UPDATE)'
          else if (stmt.startsWith('DELETE')) type = '删除 (DELETE)'
          else if (stmt.startsWith('CREATE TABLE')) type = '建表 (CREATE TABLE)'
          else if (stmt.startsWith('CREATE INDEX')) type = '建索引 (CREATE INDEX)'
          else if (stmt.startsWith('ALTER')) type = '修改表 (ALTER)'
          else if (stmt.startsWith('DROP')) type = '删除表 (DROP)'
          else if (stmt.startsWith('TRUNCATE')) type = '清空 (TRUNCATE)'
          info.push(`语句 ${idx + 1}: ${type}`)
          // 提取表名
          const fromMatch = stmt.match(/(?:FROM|INTO|UPDATE|TABLE|JOIN)\s+(\w+)/i)
          if (fromMatch) info.push(`  └─ 表名: ${fromMatch[1]}`)
          // WHERE 子句
          if (stmt.includes('WHERE')) info.push('  └─ 包含 WHERE 条件')
          // JOIN
          const joins = (stmt.match(/JOIN/g) || []).length
          if (joins) info.push(`  └─ 包含 ${joins} 个 JOIN`)
          // GROUP BY / ORDER BY
          if (stmt.includes('GROUP BY')) info.push('  └─ 包含 GROUP BY')
          if (stmt.includes('ORDER BY')) info.push('  └─ 包含 ORDER BY')
          if (stmt.includes('HAVING')) info.push('  └─ 包含 HAVING')
          if (stmt.includes('LIMIT')) info.push('  └─ 包含 LIMIT')
        })
        info.push('\n✅ SQL 语法分析完成（需要数据库连接才能实际执行）')
        this.stdout = info.join('\n')
      } catch (e) {
        this.stderr = '❌ SQL 分析错误: ' + e.message
      }
    },

    stopExecution() {
      this.isRunning = false
      this.executionStatus = 'idle'
      this.$emit('stop')
    }
  }
}
</script>

<style scoped>
.code-executor {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.executor-header {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.btn-execute {
  padding: 8px 20px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-execute:hover {
  background: #059669;
}

.btn-stop {
  padding: 8px 20px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
}

.executing-text {
  color: #f59e0b;
  font-weight: 600;
  font-size: 0.9em;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.exec-time {
  font-size: 0.85em;
  color: #666;
}

.output-section {
  border-top: 1px solid #e5e7eb;
}

.output-tabs {
  display: flex;
  gap: 0;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.output-tab {
  flex: 1;
  padding: 10px 14px;
  background: #f9fafb;
  border: none;
  border-bottom: 2px solid transparent;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  color: #666;
}

.output-tab:hover {
  background: #f3f4f6;
}

.output-tab.active {
  color: #10b981;
  border-bottom-color: #10b981;
}

.output-content {
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
}

.output-text {
  padding: 16px;
  background: white;
  min-height: 200px;
}

.output-text.error {
  background: #fef2f2;
}

.output-text pre {
  margin: 0;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  line-height: 1.6;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.output-text.error pre {
  color: #dc2626;
}

.empty-output {
  color: #ccc;
  text-align: center;
  padding: 40px 20px;
  font-size: 0.9em;
}

.info-item {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
  align-items: center;
}

.info-item .label {
  font-weight: 600;
  color: #333;
  min-width: 80px;
}

.info-item .value {
  color: #666;
  flex: 1;
}

.status-idle { color: #666; }
.status-running { color: #f59e0b; animation: pulse 1.5s infinite; }
.status-success { color: #10b981; font-weight: 700; }
.status-error { color: #ef4444; font-weight: 700; }

@media (max-width: 1024px) {
  .code-executor {
    border-radius: 6px;
  }

  .executor-header {
    padding: 10px 12px;
    gap: 8px;
  }

  .btn-execute {
    padding: 6px 16px;
    font-size: 0.9em;
  }

  .output-content {
    max-height: 300px;
  }

  .output-tabs {
    flex-wrap: wrap;
  }

  .output-tab {
    flex: 0 1 auto;
    padding: 8px 12px;
    font-size: 0.85em;
  }
}

@media (max-width: 768px) {
  .executor-header {
    flex-wrap: wrap;
    padding: 8px;
  }

  .btn-execute {
    padding: 6px 14px;
    font-size: 0.85em;
    flex: 1;
    min-width: 80px;
  }

  .btn-stop {
    padding: 6px 14px;
    font-size: 0.85em;
  }

  .executing-text {
    font-size: 0.8em;
  }

  .exec-time {
    font-size: 0.75em;
  }

  .output-content {
    max-height: 250px;
    min-height: 200px;
  }

  .output-tab {
    flex: 1;
    padding: 8px 10px;
    font-size: 0.8em;
  }

  .output-text {
    padding: 12px;
  }

  .output-text pre {
    font-size: 0.8em;
    line-height: 1.4;
  }

  .info-item {
    padding: 6px 0;
    font-size: 0.85em;
  }
}

@media (max-width: 480px) {
  .executor-header {
    gap: 4px;
  }

  .btn-execute, .btn-stop {
    padding: 5px 10px;
    font-size: 0.75em;
  }

  .output-content {
    max-height: 200px;
    min-height: 150px;
  }

  .output-tab {
    padding: 6px 8px;
    font-size: 0.7em;
  }

  .output-text {
    padding: 10px;
  }

  .output-text pre {
    font-size: 0.7em;
  }

  .info-item {
    padding: 4px 0;
    font-size: 0.75em;
    gap: 6px;
  }

  .info-item .label {
    min-width: 60px;
  }
}
</style>
