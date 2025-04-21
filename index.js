import { InstanceBase, TCPHelper, InstanceStatus, runEntrypoint } from '@companion-module/base'

class VizrtTcpEngineTrioInstance extends InstanceBase {
	/**
	 * Process configuration updates
	 */
	async configUpdated(config) {
		this.config = config

		// Close existing connection and create a new one
		this.initTCP()
	}

	/**
	 * Initialize module
	 */
	async init(config) {
		this.config = config
		this.initTCP()

		this.updateActions()
	}

	/**
	 * Initialize TCP connection
	 */
	initTCP() {
		if (this.socket !== undefined) {
			this.socket.destroy()
			delete this.socket
		}

		if (this.config.host) {
			this.updateStatus(InstanceStatus.Connecting)

			this.socket = new TCPHelper(this.config.host, this.config.port)

			this.socket.on('status_change', (status, message) => {
				this.updateStatus(status, message)
			})

			this.socket.on('error', (err) => {
				this.log('error', 'Network error: ' + err.message)
			})

			this.socket.on('connect', () => {
				this.updateStatus(InstanceStatus.Ok)
				this.log('debug', 'Connected')
			})

			this.socket.on('data', (data) => {
				// Process any received data if needed
			})
		} else {
			this.updateStatus(InstanceStatus.BadConfig, 'No host defined')
		}
	}

	/**
	 * Return config fields for web config
	 */
	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'host',
				label: 'Target Machine',
				width: 6,
				default: '127.0.0.1',
			},
			{
				type: 'number',
				id: 'port',
				label: 'Target Port',
				width: 2,
				default: 6100,
			},
			{
				type: 'dropdown',
				id: 'type',
				label: 'Connect with',
				default: 'engine',
				width: 6,
				choices: [
					{ id: 'engine', label: 'ENGINE' },
					{ id: 'trio', label: 'TRIO' },
				],
			},
		]
	}

	/**
	 * Clean up when module is deleted
	 */
	async destroy() {
		if (this.socket !== undefined) {
			this.socket.destroy()
		}
	}

	/**
	 * Set up actions
	 */
	updateActions() {
		this.setActionDefinitions({
			send: {
				name: 'Send Command',
				options: [
					{
						type: 'textinput',
						id: 'id_send',
						label: 'Command',
						tooltip: 'Type your command here',
						default: '',
						useVariables: { local: true },
					},
				],
				callback: async (action, context) => {
					// Prepare the command
					let cmds = await context.parseVariablesInString(action.options.id_send)

					let prefix, suffix
					if (this.config.type == 'engine') {
						prefix = 'vizsend '
						suffix = '\0' // or '\0\r\n'
					} else {
						prefix = ''
						suffix = '\r\n'
					}

					/*
					 * create a binary buffer pre-encoded 'latin1' (8bit no change bytes)
					 * sending a string assumes 'utf8' encoding
					 * which then escapes character values over 0x7F
					 * and destroys the 'binary' content
					 */

					for (const cmd of cmds.split(';')) {
						let sendBuf = Buffer.from(prefix + cmd.trim() + suffix, 'latin1')

						if (sendBuf.length > 0) {
							this.log('debug', 'Sending: ' + sendBuf + ' to ' + this.config.host)

							if (this.socket !== undefined && this.socket.isConnected) {
								this.socket.send(sendBuf)
							} else {
								this.log('debug', 'Socket not connected')
							}
						}
					}
				},
			},
		})
	}
}

runEntrypoint(VizrtTcpEngineTrioInstance, [])
