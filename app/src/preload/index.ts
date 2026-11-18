// The renderer's only bridge to main. See docs/ARCHITECTURE.md.
import { contextBridge } from 'electron'

const api = {}

contextBridge.exposeInMainWorld('api', api)
