// ES modules
import { InstanceBase, TCPHelper, Regex, combineRgb } from '@companion-module/base'

class VizrtTcpEngineTrioInstance extends InstanceBase {
	/**
	 * Create an instance of the module
	 *
	 * @param {Object} internal - Companion internal data
	 * @since 1.0.0
	 */
	constructor(internal) {
		super(internal)
		this.updateActions() // export actions
	}

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
	}

	/**
	 * Initialize TCP connection
	 */
	initTCP() {
		if (this.socket !== undefined) {
			this.socket.destroy()
			delete this.socket
		}

		this.updateStatus('warning', 'Connecting')

		if (this.config.host) {
			this.socket = new TCPHelper(this.config.host, this.config.port)

			this.socket.on('status_change', (status, message) => {
				this.updateStatus(status, message)
			})

			this.socket.on('error', (err) => {
				this.log('debug', 'Network error: ' + err.message)
				this.updateStatus('error', err.message)
				this.log('error', 'Network error: ' + err.message)
			})

			this.socket.on('connect', () => {
				this.updateStatus('ok')
				this.log('debug', 'Connected')
			})

			this.socket.on('data', (data) => {
				// Process any received data if needed
			})
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
				type: 'textinput',
				id: 'port',
				label: 'Target Port',
				width: 2,
				default: 6100,
				regex: Regex.PORT,
			},
			{
				type: 'dropdown',
				id: 'type',
				label: 'Connect with',
				default: 'engine',
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

		this.log('debug', 'Module destroyed: ' + this.id)
	}

	/**
	 * Set up presets
	 * (optional if not using presets)
	 */
	initPresets() {
		let presets = []
		this.setPresetDefinitions(presets)
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
						type: 'textwithvariables',
						id: 'id_send',
						label: 'Command',
						tooltip: 'Type your command here',
						default: '',
						width: 6,
					},
				],
				callback: async (action) => {
					// Prepare the command
					let cmd = await this.parseVariablesInString(action.options.id_send)
					let start, end

					if (this.config.type == 'engine') {
						start = 'vizsend '
						end = '\0' // or '\0\r\n'
					} else {
						start = ''
						end = '\r\n'
					}

					// Split and send the commands
					let cmds = cmd.split(';')

					cmds.forEach((cmd) => {
						let sendBuf = Buffer.from(start + cmd.trim() + end, 'latin1')

						if (sendBuf != '') {
							this.log('debug', 'Sending: ' + sendBuf + ' to ' + this.config.host)

							if (this.socket !== undefined && this.socket.isConnected) {
								this.socket.send(sendBuf)
							} else {
								this.log('debug', 'Socket not connected')
							}
						}
					})
				},
			},
		})
	}
}

export default VizrtTcpEngineTrioInstance
