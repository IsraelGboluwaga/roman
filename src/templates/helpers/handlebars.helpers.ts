import Handlebars from 'handlebars'

export const registerHelpers = (): void => {
  // Format date range for experience
  Handlebars.registerHelper('formatDateRange', (startDate: string, endDate?: string) => {
    if (!startDate) return ''
    
    const start = new Date(startDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    })
    
    const end = !endDate || endDate === 'present' || endDate.toLowerCase() === 'current'
      ? 'Present' 
      : new Date(endDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        })
    
    return `${start} - ${end}`
  })

  // Format single date
  Handlebars.registerHelper('formatDate', (date: string) => {
    if (!date) return ''
    
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    })
  })

  // Capitalize first letter of each word
  Handlebars.registerHelper('capitalize', (str: string) => {
    if (!str) return ''
    
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
    )
  })

  // Join array with commas
  Handlebars.registerHelper('joinCommas', (array: string[]) => {
    if (!Array.isArray(array)) return ''
    
    return array.join(', ')
  })

  // Truncate text to specified length
  Handlebars.registerHelper('truncate', (str: string, length: number) => {
    if (!str) return ''
    
    if (str.length <= length) return str
    return str.substring(0, length) + '...'
  })

  // Format phone number
  Handlebars.registerHelper('formatPhone', (phone: string) => {
    if (!phone) return ''
    
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '')
    
    // Format as (XXX) XXX-XXXX if US number
    if (cleaned.length === 10) {
      return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`
    }
    
    // Return original if not standard format
    return phone
  })

  // Check if array has items
  Handlebars.registerHelper('hasItems', (array: any[]) => {
    return Array.isArray(array) && array.length > 0
  })

  // Get current year
  Handlebars.registerHelper('currentYear', () => {
    return new Date().getFullYear()
  })
}