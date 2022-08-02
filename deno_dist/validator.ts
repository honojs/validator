import validator from "https://esm.sh/validator@13.7.0"

export default {
  ...validator,
  required: (value: unknown) => {
    if (value) {
      return true
    }
    return false
  },
}
