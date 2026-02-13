Component({
  properties: {
    show: { type: Boolean, value: false },
    position: { type: String, value: 'center' }
  },
  methods: {
    onMaskTap: function () {
      this.triggerEvent('close')
    },
    onContentTap: function () {}
  }
})
