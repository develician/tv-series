import React from 'react';
import styles from './SideBarWrapper.scss';
import classNames from 'classnames/bind';

const cx = classNames.bind(styles);

const SideBarWrapper = ({children, visible}) => (
  <div className={cx('SideBarWrapper', { hidden: !visible})}>
    {children}
  </div>
);

export default SideBarWrapper;