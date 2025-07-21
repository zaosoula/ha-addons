#!/usr/bin/with-contenv bashio
set +u

export VOLTALIS_USERNAME=$(bashio::config 'username')
export VOLTALIS_PASSWORD=$(bashio::config 'password')
bashio::log.info "Starting bridge service."
NODE_ENV=production DEBUG="voltalis-bridge*" yarn start
