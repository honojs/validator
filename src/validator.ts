import validator from 'validator'

export default {
  ...validator,
  required: (value: any) => {
    if (value) {
      return true
    }
    return false
  },
}
