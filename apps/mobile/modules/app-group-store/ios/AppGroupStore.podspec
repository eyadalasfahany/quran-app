require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'AppGroupStore'
  s.version        = package['version']
  s.summary        = 'Writes the widget snapshot into the iOS App Group UserDefaults.'
  s.license        = 'MIT'
  s.author         = 'Taybah'
  s.homepage       = 'https://github.com/taybahapp/taybah'
  s.platform       = :ios, '16.4'
  s.source         = { git: '' }
  s.static_framework = true
  s.source_files   = '**/*.{h,m,swift}'
  s.dependency 'ExpoModulesCore'
end
