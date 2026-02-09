Component({
  properties: {
    dish: { type: Object, value: {} },
    showAction: { type: Boolean, value: true },
    showDelete: { type: Boolean, value: false }
  },
  methods: {
    onTap: function () {
      this.triggerEvent('dishtap', { dishId: this.properties.dish._id })
    },
    onDelete: function () {
      this.triggerEvent('delete', { dishId: this.properties.dish._id })
    },
    onEdit: function () {
      this.triggerEvent('edit', { dish: this.properties.dish })
    }
  }
})
