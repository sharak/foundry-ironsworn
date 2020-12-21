export class IronswornItem extends Item {
    async fulfill() {
        if (this.data.data.hasOwnProperty('completed')) {
            await this.update({'data.completed': true})
        }
    }
}
