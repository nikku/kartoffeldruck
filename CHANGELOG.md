# Changelog

All notable changes to [kartoffeldruck](https://github.com/nikku/kartoffeldruck) are documented here. We use [semantic versioning](http://semver.org/) for releases.

## Unreleased

___Note:__ Yet to be released changes appear here._

## 5.1.0

* `FIX`: correctly retrieve `Kartoffeldruck` util
* `DEPS`: update to `@nikku/nunjucks@4.1.0`

## 5.0.0

* `FEAT`: generate typings
* `FEAT`: make APIs fully async
* `DEPS`: various dependency bumps / smaller installation size
* `CHORE`: migrate to typescript

### Breaking Change

* Make APIs fully async
* Remove default exports in favor of explicit explorts

## 4.0.0

* `FEAT`: make runner async capable
* `CHORE`: throw structured build errors

## 3.1.1

* `FIX`: generate natural number page meta-data

## 3.1.0

* `CHORE`: bump `nunjucks` to `@nikku/nunjucks@4.0.0`
* `CHORE`: drop `lodash` in favor of `min-dash`
* `CHORE`: substantially reduce install size

## 3.0.0

* `CHORE`: remove `Kartoffeldruck#clean` from public API
* `CHORE`: bump to `marked@0.8.0`

## 2.1.1

* `CHORE`: do not publish development assets

## 2.1.0

* `CHORE`: bump dependencies

## 2.0.0

* `FEAT`: expose `allItems` in paginated contexts
* `CHORE`: bump dependencies

## 1.0.0

* `FEAT`: allow custom content processors to be provided [#4](https://github.com/nikku/kartoffeldruck/issues/4).

## ...

Check `git log` for earlier history.