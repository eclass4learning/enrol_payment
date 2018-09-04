<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Paypal enrolments plugin settings and presets.
 *
 * @package    enrol_ecommerce
 * @copyright  2010 Eugene Venter
 * @author     Eugene Venter - based on code by Petr Skoda and others
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

if ($ADMIN->fulltree) {

    //--- settings ------------------------------------------------------------------------------------------
    $settings->add(new admin_setting_heading('enrol_ecommerce_settings', '', get_string('pluginname_desc', 'enrol_ecommerce')));

    $settings->add(new admin_setting_configtext('enrol_ecommerce/paypalbusiness', get_string('businessemail', 'enrol_ecommerce'), get_string('businessemail_desc', 'enrol_ecommerce'), '', PARAM_EMAIL));

    $settings->add(new admin_setting_configtext('enrol_ecommerce/stripesecretkey', get_string('stripesecretkey', 'enrol_ecommerce'), get_string('stripesecretkey_desc', 'enrol_ecommerce'), '', 0));

    $settings->add(new admin_setting_configtext('enrol_ecommerce/stripepublishablekey', get_string('stripepublishablekey', 'enrol_ecommerce'), get_string('stripepublishablekey_desc', 'enrol_ecommerce'), '', 0));

    $settings->add(new admin_setting_configstoredfile('enrol_ecommerce/stripelogo',
                    get_string('stripelogo', 'enrol_ecommerce'),
                    get_string('stripelogo_desc', 'enrol_ecommerce'),
                    'stripelogo'));

    $settings->add(new admin_setting_configcheckbox('enrol_ecommerce/mailstudents', get_string('mailstudents', 'enrol_ecommerce'), '', 0));

    $settings->add(new admin_setting_configcheckbox('enrol_ecommerce/mailteachers', get_string('mailteachers', 'enrol_ecommerce'), '', 0));

    $settings->add(new admin_setting_configcheckbox('enrol_ecommerce/mailadmins', get_string('mailadmins', 'enrol_ecommerce'), '', 0));

    // Note: let's reuse the ext sync constants and strings here, internally it is very similar,
    //       it describes what should happen when users are not supposed to be enrolled any more.
    $options = array(
        ENROL_EXT_REMOVED_KEEP           => get_string('extremovedkeep', 'enrol'),
        ENROL_EXT_REMOVED_SUSPENDNOROLES => get_string('extremovedsuspendnoroles', 'enrol'),
        ENROL_EXT_REMOVED_UNENROL        => get_string('extremovedunenrol', 'enrol'),
    );
    $settings->add(new admin_setting_configselect('enrol_ecommerce/expiredaction', get_string('expiredaction', 'enrol_ecommerce'), get_string('expiredaction_help', 'enrol_ecommerce'), ENROL_EXT_REMOVED_SUSPENDNOROLES, $options));

    $settings->add(new admin_setting_configcheckbox('enrol_ecommerce/allowmultipleenrol',
                                                    get_string('allowmultipleenrol', 'enrol_ecommerce'),
                                                    get_string('allowmultipleenrol_help', 'enrol_ecommerce'),0));

    $settings->add(new admin_setting_configcheckbox('enrol_ecommerce/enablediscounts',
                                                    get_string('allowdiscounts', 'enrol_ecommerce'),
                                                    get_string('allowdiscounts_help', 'enrol_ecommerce'),0));

    //--- enrol instance defaults ----------------------------------------------------------------------------
    $settings->add(new admin_setting_heading('enrol_ecommerce_defaults',
        get_string('enrolinstancedefaults', 'admin'), get_string('enrolinstancedefaults_desc', 'admin')));

    $options = array(ENROL_INSTANCE_ENABLED  => get_string('yes'),
                     ENROL_INSTANCE_DISABLED => get_string('no'));
    $settings->add(new admin_setting_configselect('enrol_ecommerce/status',
        get_string('status', 'enrol_ecommerce'), get_string('status_desc', 'enrol_ecommerce'), ENROL_INSTANCE_DISABLED, $options));

    $settings->add(new admin_setting_configtext('enrol_ecommerce/cost', get_string('cost', 'enrol_ecommerce'), '', 0, PARAM_FLOAT, 4));

    $ecommercecurrencies = enrol_get_plugin('ecommerce')->get_currencies();
    $settings->add(new admin_setting_configselect('enrol_ecommerce/currency', get_string('currency', 'enrol_ecommerce'), '', 'USD', $ecommercecurrencies));

    if (!during_initial_install()) {
        $options = get_default_enrol_roles(context_system::instance());
        $student = get_archetype_roles('student');
        $student = reset($student);
        $settings->add(new admin_setting_configselect('enrol_ecommerce/roleid',
            get_string('defaultrole', 'enrol_ecommerce'), get_string('defaultrole_desc', 'enrol_ecommerce'), $student->id, $options));
    }

    $settings->add(new admin_setting_configduration('enrol_ecommerce/enrolperiod',
        get_string('enrolperiod', 'enrol_ecommerce'), get_string('enrolperiod_desc', 'enrol_ecommerce'), 0));

    $settings->add(new admin_setting_configselect('enrol_ecommerce/sendcoursewelcomemessage',
            get_string('sendcoursewelcomemessage', 'enrol_ecommerce'),
            get_string('sendcoursewelcomemessage_help', 'enrol_ecommerce'),
            ENROL_SEND_EMAIL_FROM_COURSE_CONTACT,
            enrol_send_welcome_email_options()));

    $settings->add(new admin_setting_configtextarea('enrol_ecommerce/defaultcoursewelcomemessage',
        get_string('defaultcoursewelcomemessage', 'enrol_ecommerce'),
        null,
        null));
}
