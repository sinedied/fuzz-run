#!/usr/bin/env node
import process from 'node:process';
import { fuzzyRun } from '../index.js';

fuzzyRun(process.argv.slice(2));
