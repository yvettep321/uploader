import providers from '../ci_providers'
import { info, logError, verbose } from '../helpers/logger'
import { IServiceParams, UploaderInputs } from '../types'

export function detectProvider(inputs: UploaderInputs): Partial<IServiceParams> {
  const { args, environment } = inputs
  let serviceParams: Partial<IServiceParams> | undefined

  //   check if we have a complete set of manual overrides (slug, SHA)
  if (args.sha && args.slug) {
    // We have the needed args for a manual override
    info(
      `Using manual override from args.`,
    )
    serviceParams = {
      commit: args.sha,
      slug: args.slug,
    }
  } else {
    serviceParams = undefined
  }

  //   loop though all providers
  try {
    serviceParams = { ...walkProviders(inputs), ...serviceParams }
    if (serviceParams !== undefined) {
      return serviceParams
    }
  } catch (error) {
    //   if fails, display message explaining failure, and explaining that SHA and slug need to be set as args
    if (serviceParams !== undefined) {
      logError(`Errow detecting repos setting using git: ${error}`)
    } else {
      throw new Error(
        '\nUnable to detect service, please specify sha and slug manually.\nYou can do this by passing the values with the `-S` and `-r` flags.\nSee the `-h` flag for more details.',
      )
    }
  }
  return serviceParams
}

export function walkProviders(
  inputs: UploaderInputs,
): IServiceParams {
  for (const provider of providers) {
    if (provider.detect(inputs.environment)) {
      info(`Detected ${provider.getServiceName()} as the CI provider.`)
      verbose(
        '-> Using the following env variables:',
        Boolean(inputs.args.verbose),
      )
      for (const envVarName of provider.getEnvVarNames()) {
        verbose(
          `     ${envVarName}: ${inputs.environment[envVarName]}`,
          Boolean(inputs.args.verbose),
        )
      }
      return provider.getServiceParams(inputs)
    }
  }
  throw new Error(`Unable to detect provider.`)
}