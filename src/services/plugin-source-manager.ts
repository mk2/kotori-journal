import * as path from 'path'
import * as fs from 'fs/promises'
import { existsSync } from 'fs'
import { Plugin, PluginSource } from '../models/plugin'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export class PluginSourceManager {
  constructor(private dataPath: string) {}

  async loadPlugin(source: PluginSource): Promise<Plugin> {
    switch (source.type) {
      case 'npm':
        return this.loadNpmPlugin(source)
      case 'local':
        return this.loadLocalPlugin(source)
      case 'git':
        return this.loadGitPlugin(source)
      default:
        throw new Error(`Unsupported plugin source type: ${source.type}`)
    }
  }

  private async loadNpmPlugin(source: PluginSource): Promise<Plugin> {
    await this.ensureNpmPackage(source.identifier, source.version)

    const modulePath = path.join(this.getNpmPluginDir(), 'node_modules', source.identifier)
    const module = await import(modulePath)
    return this.validateAndWrapPlugin(module.default || module)
  }

  private async loadLocalPlugin(source: PluginSource): Promise<Plugin> {
    if (!source.path) {
      throw new Error('Local plugin source must specify path')
    }

    const resolvedPath = path.resolve(source.path)
    await this.validateLocalPath(resolvedPath)

    const modulePath = await this.prepareLocalModule(resolvedPath)
    const module = await import(modulePath)
    return this.validateAndWrapPlugin(module.default || module)
  }

  private async loadGitPlugin(source: PluginSource): Promise<Plugin> {
    if (!source.repository) {
      throw new Error('Git plugin source must specify repository')
    }

    const tempDir = await this.cloneRepository(source.repository, source.branch || 'main')

    await this.installDependencies(tempDir)
    await this.buildPlugin(tempDir)

    const modulePath = path.join(tempDir, 'dist/index.js')
    if (!existsSync(modulePath)) {
      // fallback to index.js in root
      const fallbackPath = path.join(tempDir, 'index.js')
      if (existsSync(fallbackPath)) {
        const module = await import(fallbackPath)
        return this.validateAndWrapPlugin(module.default || module)
      }
      throw new Error('Plugin entry point not found after build')
    }

    const module = await import(modulePath)
    return this.validateAndWrapPlugin(module.default || module)
  }

  private async ensureNpmPackage(packageName: string, version?: string): Promise<void> {
    const npmDir = this.getNpmPluginDir()
    await this.ensureDir(npmDir)

    const packageJsonPath = path.join(npmDir, 'package.json')
    if (!existsSync(packageJsonPath)) {
      await this.createPluginPackageJson()
    }

    const packageSpec = version ? `${packageName}@${version}` : packageName

    try {
      await execAsync(`npm install ${packageSpec}`, { cwd: npmDir })
    } catch (error) {
      throw new Error(`Failed to install npm package ${packageSpec}: ${error}`)
    }
  }

  private async createPluginPackageJson(): Promise<void> {
    const packageJson = {
      name: 'kotori-journal-plugins',
      version: '1.0.0',
      private: true,
      dependencies: {},
    }

    await fs.writeFile(
      path.join(this.getNpmPluginDir(), 'package.json'),
      JSON.stringify(packageJson, null, 2)
    )
  }

  private async ensureDir(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
      await fs.mkdir(dirPath, { recursive: true })
    }
  }

  private async validateLocalPath(pluginPath: string): Promise<void> {
    const allowedPaths = [
      path.resolve('./plugins'),
      path.resolve(
        process.env.KOTORI_PLUGIN_PATH || path.join(process.env.HOME || '~', 'kotori-plugins')
      ),
    ]

    if (!allowedPaths.some(allowed => pluginPath.startsWith(allowed))) {
      throw new Error('Plugin path not allowed for security reasons')
    }

    if (!existsSync(pluginPath)) {
      throw new Error(`Plugin path does not exist: ${pluginPath}`)
    }
  }

  private async prepareLocalModule(pluginPath: string): Promise<string> {
    const packageJsonPath = path.join(pluginPath, 'package.json')

    if (existsSync(packageJsonPath)) {
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(packageJsonContent)
      const mainFile = packageJson.main || 'index.js'

      if (mainFile.endsWith('.ts')) {
        return this.compileTypeScript(pluginPath)
      } else {
        return path.join(pluginPath, mainFile)
      }
    }

    // fallback to index.js or index.ts
    const jsPath = path.join(pluginPath, 'index.js')
    const tsPath = path.join(pluginPath, 'index.ts')

    if (existsSync(jsPath)) {
      return jsPath
    } else if (existsSync(tsPath)) {
      return this.compileTypeScript(pluginPath)
    }

    throw new Error('Plugin entry point not found')
  }

  private async compileTypeScript(pluginPath: string): Promise<string> {
    // This is a simplified TypeScript compilation
    // In a real implementation, you might want to use the TypeScript compiler API
    const distPath = path.join(pluginPath, 'dist')
    await this.ensureDir(distPath)

    try {
      // Try to build using npm script first
      const packageJsonPath = path.join(pluginPath, 'package.json')
      if (existsSync(packageJsonPath)) {
        const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8')
        const packageJson = JSON.parse(packageJsonContent)
        if (packageJson.scripts?.build) {
          await execAsync('npm run build', { cwd: pluginPath })
          return path.join(distPath, 'index.js')
        }
      }

      // Fallback: simple tsc compilation
      await execAsync('npx tsc', { cwd: pluginPath })
      return path.join(distPath, 'index.js')
    } catch (error) {
      throw new Error(`Failed to compile TypeScript plugin: ${error}`)
    }
  }

  private async cloneRepository(repository: string, branch: string): Promise<string> {
    const gitDir = this.getGitPluginDir()
    const repoName = this.extractRepoName(repository)
    const targetPath = path.join(gitDir, repoName)

    await this.ensureDir(gitDir)

    if (existsSync(targetPath)) {
      // Update existing repository
      await execAsync(`git pull origin ${branch}`, { cwd: targetPath })
    } else {
      // Clone new repository
      await execAsync(`git clone -b ${branch} ${repository} ${targetPath}`)
    }

    return targetPath
  }

  private async installDependencies(pluginPath: string): Promise<void> {
    const packageJsonPath = path.join(pluginPath, 'package.json')

    if (existsSync(packageJsonPath)) {
      try {
        await execAsync('npm install', { cwd: pluginPath })
      } catch (error) {
        throw new Error(`Failed to install dependencies: ${error}`)
      }
    }
  }

  private async buildPlugin(pluginPath: string): Promise<void> {
    const packageJsonPath = path.join(pluginPath, 'package.json')

    if (existsSync(packageJsonPath)) {
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(packageJsonContent)

      if (packageJson.scripts?.build) {
        try {
          await execAsync('npm run build', { cwd: pluginPath })
        } catch (error) {
          throw new Error(`Failed to build plugin: ${error}`)
        }
      }
    }
  }

  private validateAndWrapPlugin(pluginModule: unknown): Plugin {
    if (!pluginModule || typeof pluginModule !== 'object') {
      throw new Error('Plugin must export an object or class')
    }

    let plugin = pluginModule

    // If it's a class constructor, instantiate it
    if (typeof pluginModule === 'function') {
      try {
        plugin = new (pluginModule as new () => object)()
      } catch {
        throw new Error('Failed to instantiate plugin class')
      }
    }

    // Type guard to ensure plugin is an object
    if (!plugin || typeof plugin !== 'object') {
      throw new Error('Plugin must be an object')
    }

    const pluginObj = plugin as Record<string, unknown>

    // Validate required fields
    if (!pluginObj.name || typeof pluginObj.name !== 'string') {
      throw new Error('Plugin must have a name property')
    }

    if (!pluginObj.version || typeof pluginObj.version !== 'string') {
      throw new Error('Plugin must have a version property')
    }

    if (!pluginObj.initialize || typeof pluginObj.initialize !== 'function') {
      throw new Error('Plugin must have an initialize method')
    }

    if (!pluginObj.description || typeof pluginObj.description !== 'string') {
      throw new Error('Plugin must have a description property')
    }

    if (!pluginObj.author || typeof pluginObj.author !== 'string') {
      throw new Error('Plugin must have an author property')
    }

    return pluginObj as unknown as Plugin
  }

  private extractRepoName(repository: string): string {
    const match = repository.match(/\/([^/]+?)(?:\.git)?$/)
    return match ? match[1] : 'unknown-plugin'
  }

  private getNpmPluginDir(): string {
    return path.join(this.dataPath, 'plugins', 'npm')
  }

  private getLocalPluginDir(): string {
    return path.join(this.dataPath, 'plugins', 'local')
  }

  private getGitPluginDir(): string {
    return path.join(this.dataPath, 'plugins', 'git')
  }
}
