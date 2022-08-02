import validator from 'validator'

export default {
  ...validator,
  required: (value: unknown) => {
    if (value) {
      return true
    }
    return false
  },
}
