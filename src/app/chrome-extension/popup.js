document.addEventListener('DOMContentLoaded', () => {
  const resumeTextarea = document.getElementById('resume')
  const fillBtn = document.getElementById('fillBtn')
  const statusDiv = document.getElementById('status')

  // Load saved resume
  chrome.storage.sync.get(['resume'], (result) => {
    if (result.resume) {
      resumeTextarea.value = result.resume
    }
  })

  // Save resume on change
  resumeTextarea.addEventListener('input', () => {
    chrome.storage.sync.set({ resume: resumeTextarea.value })
  })

  fillBtn.addEventListener('click', async () => {
    const resume = resumeTextarea.value.trim()

    if (!resume) {
      showStatus('Please paste your resume first', 'error')
      return
    }

    fillBtn.disabled = true
    fillBtn.textContent = 'Filling form...'
    showStatus('Analyzing form and generating answers...', 'info')

    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      })

      // Send message to background script
      const response = await chrome.runtime.sendMessage({
        action: 'fillForm',
        resume: resume,
      })

      if (response.error) {
        showStatus(`Error: ${response.error}`, 'error')
      } else {
        showStatus(
          `✓ Successfully filled ${response.fieldsFilled} of ${response.fieldsFound} fields!`,
          'success'
        )
      }
    } catch (error) {
      showStatus(`Error: ${error.message}`, 'error')
    } finally {
      fillBtn.disabled = false
      fillBtn.textContent = 'Fill Form with AI'
    }
  })

  function showStatus(message, type) {
    statusDiv.textContent = message
    statusDiv.className = `status ${type}`
    statusDiv.style.display = 'block'

    if (type === 'success') {
      setTimeout(() => {
        statusDiv.style.display = 'none'
      }, 5000)
    }
  }
})
