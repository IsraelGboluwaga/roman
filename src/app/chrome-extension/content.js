// Extract all form fields with their context
function extractFormFields() {
  const fields = []

  // Get all input, textarea, and select elements
  const inputs = document.querySelectorAll('input, textarea, select')

  inputs.forEach((element, index) => {
    // Skip hidden, submit, and button inputs
    if (
      element.type === 'hidden' ||
      element.type === 'submit' ||
      element.type === 'button'
    ) {
      return
    }

    const field = {
      id: element.id || `field_${index}`,
      name: element.name || '',
      type: element.type || element.tagName.toLowerCase(),
      label: getFieldLabel(element),
      placeholder: element.placeholder || '',
      required: element.required,
      value: element.value || '',
      options: element.tagName === 'SELECT' ? getSelectOptions(element) : null,
      xpath: getXPath(element),
    }

    fields.push(field)
  })

  return fields
}

// Get label associated with a field
function getFieldLabel(element) {
  // Try to find label by 'for' attribute
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`)
    if (label) return label.innerText.trim()
  }

  // Try parent label
  const parentLabel = element.closest('label')
  if (parentLabel) return parentLabel.innerText.trim()

  // Try previous sibling
  let prev = element.previousElementSibling
  while (prev) {
    if (prev.tagName === 'LABEL') return prev.innerText.trim()
    if (prev.innerText && prev.innerText.trim().length < 200) {
      return prev.innerText.trim()
    }
    prev = prev.previousElementSibling
  }

  // Try aria-label
  return (
    element.getAttribute('aria-label') ||
    element.getAttribute('aria-labelledby') ||
    ''
  )
}

// Get select dropdown options
function getSelectOptions(selectElement) {
  return Array.from(selectElement.options).map((opt) => ({
    value: opt.value,
    text: opt.text,
  }))
}

// Generate XPath for reliable element selection
function getXPath(element) {
  if (element.id) {
    return `//*[@id="${element.id}"]`
  }

  const paths = []
  for (; element && element.nodeType === 1; element = element.parentNode) {
    let index = 0
    for (
      let sibling = element.previousSibling;
      sibling;
      sibling = sibling.previousSibling
    ) {
      if (
        sibling.nodeType === Node.ELEMENT_NODE &&
        sibling.tagName === element.tagName
      ) {
        index++
      }
    }

    const tagName = element.tagName.toLowerCase()
    const pathIndex = index ? `[${index + 1}]` : ''
    paths.unshift(`${tagName}${pathIndex}`)
  }

  return paths.length ? `/${paths.join('/')}` : ''
}

// Fill form fields with AI responses
function fillFormFields(fieldMappings) {
  fieldMappings.forEach((mapping) => {
    const element = getElementByXPath(mapping.xpath)

    if (!element) {
      console.warn(`Element not found for xpath: ${mapping.xpath}`)
      return
    }

    fillElement(element, mapping.answer, mapping.type)
  })
}

// Get element by XPath
function getElementByXPath(xpath) {
  return document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue
}

// Fill different types of form elements
function fillElement(element, value, type) {
  switch (type) {
    case 'select':
    case 'select-one':
      // Find matching option
      const option = Array.from(element.options).find(
        (opt) =>
          opt.text.toLowerCase().includes(value.toLowerCase()) ||
          opt.value.toLowerCase().includes(value.toLowerCase())
      )
      if (option) {
        element.value = option.value
        element.dispatchEvent(new Event('change', { bubbles: true }))
      }
      break

    case 'checkbox':
      element.checked = value === true || value === 'true' || value === 'yes'
      element.dispatchEvent(new Event('change', { bubbles: true }))
      break

    case 'radio':
      if (element.value === value) {
        element.checked = true
        element.dispatchEvent(new Event('change', { bubbles: true }))
      }
      break

    case 'textarea':
    case 'text':
    case 'email':
    case 'tel':
    case 'url':
    default:
      element.value = value
      element.dispatchEvent(new Event('input', { bubbles: true }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
      break
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractFields') {
    const fields = extractFormFields()
    sendResponse({ fields })
  }

  if (request.action === 'fillFields') {
    fillFormFields(request.fieldMappings)
    sendResponse({ success: true })
  }

  return true // Keep message channel open for async response
})
