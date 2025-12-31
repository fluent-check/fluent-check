
if (!process.send) {
  throw new Error('This script must be run as a child process')
}

process.on('message', async (message: any) => {
  if (message.type === 'run') {
    const { modulePath, functionName, args } = message.payload
    
    try {
      // Dynamically import the study module
      const module = await import(modulePath)
      
      if (typeof module[functionName] !== 'function') {
        throw new Error(`Function '${functionName}' not found in module '${modulePath}'`)
      }

      // Execute the function
      const result = await module[functionName](...args)

      // Send back result
      process.send!({
        type: 'result',
        taskId: message.taskId,
        result
      })
    } catch (err: any) {
      process.send!({
        type: 'error',
        taskId: message.taskId,
        error: err.message || String(err),
        stack: err.stack
      })
    }
  }
})
