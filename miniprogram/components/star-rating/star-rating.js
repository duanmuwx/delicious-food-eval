Component({
  properties: {
    value: { type: Number, value: 0 },
    readonly: { type: Boolean, value: false },
    size: { type: Number, value: 40 }
  },
  methods: {
    onTap: function (e) {
      if (this.properties.readonly) return
      var score = e.currentTarget.dataset.score
      this.setData({ value: score })
      this.triggerEvent('change', { value: score })
    }
  }
})
