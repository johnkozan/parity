// Copyright 2015, 2016 Parity Technologies (UK) Ltd.
// This file is part of Parity.

// Parity is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Parity is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Parity.  If not, see <http://www.gnu.org/licenses/>.

import React, { Component, PropTypes } from 'react';

import { chunkArray } from '~/util/array';
import { arrayOrObjectProptype, nodeOrStringProptype } from '~/util/proptypes';

import Container from '../Container';

import styles from './sectionList.css';

const ITEMS_PER_ROW = 3;

export default class SectionList extends Component {
  static propTypes = {
    className: PropTypes.string,
    items: arrayOrObjectProptype().isRequired,
    renderItem: PropTypes.func.isRequired,
    overlay: nodeOrStringProptype()
  }

  render () {
    const { className, items } = this.props;

    if (!items || !items.length) {
      return null;
    }

    return (
      <section className={ [styles.section, className].join(' ') }>
        { this.renderOverlay() }
        { chunkArray(items, ITEMS_PER_ROW).map(this.renderRow) }
      </section>
    );
  }

  renderOverlay () {
    const { overlay } = this.props;

    if (!overlay) {
      return null;
    }

    return (
      <div className={ styles.ovelay }>
        { overlay }
      </div>
    );
  }

  renderRow = (row, index) => {
    return (
      <div
        className={ styles.row }
        key={ `row_${index}` }
      >
        { row.map(this.renderItem) }
      </div>
    );
  }

  renderItem = (item, index) => {
    const { renderItem } = this.props;

    return (
      <div
        className={ styles.item }
        key={ `item_${index}` }
      >
        <Container className={ styles.container }>
          { renderItem(item, index) }
        </Container>
      </div>
    );
  }
}