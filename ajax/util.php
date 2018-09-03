<?php

require_once(dirname(__FILE__).'/../../../config.php');
require_once("$CFG->libdir/moodlelib.php");
require_once(dirname(__FILE__).'/../lang/en/enrol_ecommerce.php');

global $DB;

/**
 * When switching between Single and Multiple mode, make the necessary
 * adjustments to our payment row in the database.
 */
function update_payment_data($multiple, $users, $payment) {
    global $DB;

    $userids = array();
    if($multiple) {
        foreach($users as $u) {
            array_push($userids, $u["id"]);
        }
    }

    $payment->multiple = $multiple;
    $payment->multiple_userids = $multiple ? implode(",",$userids) : null;
    $payment->units = $multiple ? sizeof($userids) : 1;
    $DB->update_record("enrol_ecommerce_ipn", $payment);
}

function get_moodle_users_by_emails($emails) {
    global $DB;
    $notfound = array();
    $users = array();

    foreach($emails as $email) {
        $user = $DB->get_record('user', array('email' => $email), "id, email, firstname, lastname");
        if($user) {
            $userdata = [ "id" => $user->id
                        , "email" => $email
                        , "name" => ($user->firstname . " " . $user->lastname)
                        ];
            array_push($users, $userdata);
        } else {
            array_push($notfound, $email);
        }

    }

    if (!empty($notfound)) {
        throw new Exception(get_string("usersnotfoundwithemail", "enrol_ecommerce") . implode("<li>", $notfound) . "</ul>");
    }

    return $users;
}

function pretty_print_user($u) {
    return $u["name"] . " &lt;" . $u["email"] . "&gt;";
}

function get_payment_from_token($prepayToken) {
    global $DB;
    return $DB->get_record_sql('SELECT * FROM {enrol_ecommerce_ipn}
                                  WHERE ' .$DB->sql_compare_text('prepaytoken') . ' = ? ',
                              array('prepaytoken' => $prepayToken));
}

/**
 * @param $instance enrol_ecommerce instance
 * @param $payment payment object from enrol_ecommerce_ipn
 * @return object with "subtotal" and "subtotal_localised" fields.
 */
function calculate_cost($instance, $payment) {
    $discount_amount = $instance->customdec1;
    //$ret["discount_amount"] = $discount_amount;
    $cost = $instance->cost;
    $subtotal = $cost;

    if($payment->discounted && $discount_amount < 0.00) {
        throw new Exception(get_string("negativediscount", "enrol_ecommerce"));
    }

    if($payment->units < 1) {
        throw new Exception(get_string("notenoughunits", "enrol_ecommerce"));
    }

    if(!$payment->discounted) {
        $discount_amount = 0.0;
    }

    switch ($instance->customint3) {
        case 0:
            $subtotal = $cost * $payment->units;

            break;
        case 1:
            if($discount_amount > 100) {
                throw new Exception(get_string("percentdiscountover100error", "enrol_ecommerce"));
            }

            //Percentages over 1 converted to a float between 0 and 1.
            if($discount_amount > 1.0) {
                $normalized_discount = $discount_amount * 0.01;
            } else {
                $normalized_discount = $discount_amount;
            }

            //Per-unit cost is the difference between the full cost and the percent discount.
            $per_unit_cost = $cost - ($cost * $normalized_discount);
            $subtotal = $per_unit_cost * $payment->units;

            break;
        case 2:
            $subtotal = ($cost - $discount_amount) * $payment->units;

            break;
        default:
            throw new Exception(get_string("discounttypeerror", "enrol_ecommerce"));
            break;
    }

    $ret['subtotal'] = format_float($subtotal, 2, false);
    $ret['subtotal_localised'] = format_float($subtotal, 2, true);

    return $ret;
}
