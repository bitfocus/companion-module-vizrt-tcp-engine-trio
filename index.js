const tcp = require('../../tcp')
const instance_skel = require('../../instance_skel')

class instance extends instance_skel {
	/**
	 * Create an instance of the module
	 *
	 * @param {EventEmitter} system - the brains of the operation
	 * @param {string} id - the instance ID
	 * @param {Object} config - saved user configuration parameters
	 * @since 1.0.0
	 */
	constructor(system, id, config) {
		super(system, id, config)
		this.actions() // export actions
		//this.init_presets() // export presets
	}

	updateConfig(config) {
		//this.init_presets()

		if (this.socket !== undefined) {
			this.socket.destroy()
			delete this.socket
		}

		this.config = config
		this.init_tcp()
	}

	init() {
		//this.init_presets()
		this.init_tcp()
	}

	init_tcp() {
		if (this.socket !== undefined) {
			this.socket.destroy()
			delete this.socket
		}

		this.status(this.STATE_WARNING, 'Connecting')

		if (this.config.host) {
			this.socket = new tcp(this.config.host, this.config.port)

			this.socket.on('status_change', (status, message) => {
				this.status(status, message)
			})

			this.socket.on('error', (err) => {
				this.debug('Network error', err)
				this.status(this.STATE_ERROR, err)
				this.log('error', 'Network error: ' + err.message)
			})

			this.socket.on('connect', () => {
				this.status(this.STATE_OK)
				this.debug('Connected')
			})

			this.socket.on('data', (data) => {})
		}
	}

	// Return config fields for web config
	config_fields() {
		return [
			{
				type: 'textinput',
				id: 'host',
				label: 'Target Machine',
				width: 6,
				default: '127.0.0.1',
				//regex: this.REGEX_IP,
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'Target Port',
				width: 2,
				default: 6100,
				regex: this.REGEX_PORT,
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

	// When module gets deleted
	destroy() {
		if (this.socket !== undefined) {
			this.socket.destroy()
		}

		this.debug('destroy', this.id)
	}

	init_presets() {
		let presets = []
		this.setPresetDefinitions(presets)
	}

	actions(system) {
		this.setActions({
			send: {
				label: 'Send Command',
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
			},
		})
	}

	action(action) {
		let cmd, start, end

		switch (action.action) {
			case 'send':
				this.parseVariables(action.options.id_send, (value) => {
					cmd = unescape(value)
				})

				if (this.config.type == 'engine') {
					start = 'vizsend '
					end = '\0' //or '\0\r\n'
				} else {
					start = ''
					end = '\r\n'
				}

				break
		}

		/*
		 * create a binary buffer pre-encoded 'latin1' (8bit no change bytes)
		 * sending a string assumes 'utf8' encoding
		 * which then escapes character values over 0x7F
		 * and destroys the 'binary' content
		 */

		let cmds = cmd.split(';')

		cmds.forEach((cmd) => {
			let sendBuf = Buffer.from(start + cmd.trim() + end, 'latin1')

			if (sendBuf != '') {
				this.debug('sending ', sendBuf, 'to', this.config.host)

				if (this.socket !== undefined && this.socket.connected) {
					this.socket.send(sendBuf)
				} else {
					this.debug('Socket not connected :(')
				}
			}
		})
	}
}
exports = module.exports = instance
